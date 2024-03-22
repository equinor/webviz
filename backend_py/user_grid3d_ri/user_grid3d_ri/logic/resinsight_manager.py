from typing import Iterator
import logging
from dataclasses import dataclass
import os
import asyncio

import grpc
import psutil

from webviz_pkg.core_utils.background_tasks import run_in_background_task

from rips.generated import App_pb2_grpc, Definitions_pb2

from user_grid3d_ri.utils.radix_utils import IS_ON_RADIX_PLATFORM, read_radix_job_payload_as_json

LOGGER = logging.getLogger(__name__)


_RI_EXECUTABLE = os.environ["RESINSIGHT_EXECUTABLE"]
_RI_PORT = 50099


@dataclass(frozen=True, kw_only=True)
class _RiInstanceInfo:
    pid: int
    channel: grpc.aio.Channel


class ResInsightManager:
    def __init__(self) -> None:
        self._ri_info: _RiInstanceInfo | None = None
        self._mutex_lock = asyncio.Lock()

    async def get_channel_for_running_ri_instance_async(self) -> grpc.aio.Channel | None:
        instance = await self._get_or_create_ri_instance()
        if not instance:
            return None

        return instance.channel

    async def get_port_of_running_ri_instance_async(self) -> int | None:
        instance = await self._get_or_create_ri_instance()
        if not instance:
            return None

        return _RI_PORT

    async def _get_or_create_ri_instance(self) -> _RiInstanceInfo | None:
        async with self._mutex_lock:
            LOGGER.debug(f"_get_or_create_ri_instance() - has a registered instance: {'YES' if self._ri_info else 'NO'}")
            if self._ri_info:
                try:
                    process = psutil.Process(self._ri_info.pid)
                    LOGGER.debug(f"_get_or_create_ri_instance() - {process=}")
                    if process.is_running() and process.status() != psutil.STATUS_ZOMBIE:
                        LOGGER.debug(f"_get_or_create_ri_instance() - process is already running, pid={self._ri_info.pid}")
                        return self._ri_info
                except psutil.NoSuchProcess:
                    pass

                LOGGER.debug(f"_get_or_create_ri_instance() - process does NOT seem to be running, pid={self._ri_info.pid}")

            # Either we don't have a process or the process is dead, so we'll clean up and try to launch a new one
            if self._ri_info and self._ri_info.channel:
                LOGGER.debug(f"_get_or_create_ri_instance() - trying to close existing grpc channel")
                await self._ri_info.channel.close()

            self._ri_info = None
            _kill_competing_ri_processes()

            LOGGER.debug(f"_get_or_create_ri_instance() - launching new ResInsight process")
            new_pid = await _launch_ri_instance()
            if new_pid < 0:
                LOGGER.error("Failed to launch ResInsight process")
                return None

            new_channel: grpc.aio.Channel = grpc.aio.insecure_channel(
                f"localhost:{_RI_PORT}",
                options=[("grpc.enable_http_proxy", False), ("grpc.max_receive_message_length", 512 * 1024 * 1024)],
            )
            if not await _probe_grpc_alive(new_channel):
                LOGGER.error("Probe against newly launched ResInsight process failed")
                return None

            self._ri_info = _RiInstanceInfo(pid=new_pid, channel=new_channel)
            LOGGER.debug(
                f"_get_or_create_ri_instance() - successfully launched new ResInsight process, pid={self._ri_info.pid}"
            )

            return self._ri_info


def _kill_competing_ri_processes() -> None:

    terminated_procs: list[psutil.Process] = []

    all_processes: Iterator[psutil.Process] = psutil.process_iter(["pid", "ppid", "name", "exe", "cmdline"])
    for proc in all_processes:
        # The info dict gets added by the psutil.process_iter() function
        info_dict = proc.info  # type: ignore[attr-defined]
        if info_dict["exe"] == _RI_EXECUTABLE:
            cmd_line = info_dict.get("cmdline")
            if cmd_line is not None and "--server" in cmd_line and f"{_RI_PORT}" in cmd_line:
                LOGGER.debug(f"Terminating ResInsight process with PID: {info_dict['pid']}")
                proc.terminate()
                terminated_procs.append(proc)

    _gone, alive = psutil.wait_procs(terminated_procs, timeout=5, callback=_on_terminate)
    for proc in alive:
        LOGGER.debug(f"KILLING ResInsight process with PID: {proc.pid}")
        proc.kill()


def _on_terminate(proc: psutil.Process):
    # returncode is added just for this callback, it is not part of the original psutil.Process class
    LOGGER.debug(f"process {proc} terminated with exit code {proc.returncode}")  # type: ignore[attr-defined]


async def _stream_watcher(stream: asyncio.streams.StreamReader, stream_name) -> None:
    async for data in stream:
        line = data.decode("ascii").rstrip()
        LOGGER.debug(f"ResInsight({stream_name})--{line}")

    LOGGER.debug(f"_stream_watcher() for {stream_name=} exiting")


async def _launch_ri_instance() -> int:

    # Quick and dirty, redirect to our own stdout
    # proc: asyncio.subprocess.Process = await asyncio.create_subprocess_exec(_RI_EXECUTABLE, "--console", "--server", f"{_RI_PORT}", stdout=sys.stdout, stderr=sys.stderr)

    env_dict = None
    if IS_ON_RADIX_PLATFORM:
        job_payload_dict = read_radix_job_payload_as_json()
        LOGGER.debug(f"_launch_ri_instance() - {job_payload_dict=}")

        if job_payload_dict and "ri_omp_num_treads" in job_payload_dict:
            ri_omp_num_treads = job_payload_dict["ri_omp_num_treads"]
            env_dict = {"OMP_NUM_THREADS": str(ri_omp_num_treads)}

    LOGGER.debug(f"_launch_ri_instance() - {env_dict=}")

    proc: asyncio.subprocess.Process = await asyncio.create_subprocess_exec(
        _RI_EXECUTABLE,
        "--console",
        "--server",
        f"{_RI_PORT}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env_dict,
    )

    _stdout_task = run_in_background_task(_stream_watcher(proc.stdout, "stdout"))
    _stderr_task = run_in_background_task(_stream_watcher(proc.stderr, "stderr"))

    if not proc:
        return -1

    return proc.pid


async def _probe_grpc_alive(channel: grpc.aio.Channel) -> bool:
    app_stub = App_pb2_grpc.AppStub(channel)

    try:
        LOGGER.debug(f"_probe_grpc_alive() - probing ...")
        grpc_response = await app_stub.GetVersion(Definitions_pb2.Empty(), timeout=4.0, wait_for_ready=True)
        LOGGER.debug(f"_probe_grpc_alive() - {str(grpc_response)=}")
        return True
    except grpc.aio.AioRpcError as exception:
        LOGGER.error(f"_probe_grpc_alive() - probe failed!!!  {exception=}")
        pass

    return False


RESINSIGHT_MANAGER = ResInsightManager()
