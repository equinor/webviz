from typing import Iterator
import logging
from dataclasses import dataclass
import os
import sys
import time
import subprocess

import grpc
import psutil


from rips.generated import App_pb2_grpc, Definitions_pb2

LOGGER = logging.getLogger(__name__)


_RI_EXECUTABLE = os.environ["RESINSIGHT_EXECUTABLE"]
_RI_PORT = 50099


@dataclass(frozen=True, kw_only=True)
class _InstanceInfo:
    pid: int
    channel: grpc.Channel


class ResInsightManager:
    def __init__(self) -> None:
        self._instance_info: _InstanceInfo | None = None

    def get_channel_for_running_ri_instance(self) -> grpc.Channel | None:
        instance = self._get_or_create_ri_instance()
        if not instance:
            return None

        return instance.channel

    def get_port_of_running_ri_instance(self) -> int | None:
        instance = self._get_or_create_ri_instance()
        if not instance:
            return None

        return _RI_PORT

    def _get_or_create_ri_instance(self) -> _InstanceInfo | None:
        LOGGER.debug(f"_get_or_create_ri_instance() - has running instance: {'YES' if self._instance_info else 'NO'}")
        if self._instance_info:
            process = psutil.Process(self._instance_info.pid)
            LOGGER.debug(f"_get_or_create_ri_instance() - {process.status()=}")
            LOGGER.debug(f"_get_or_create_ri_instance() - {process=}")
            if process.is_running() and process.status() != psutil.STATUS_ZOMBIE:
                LOGGER.debug(f"_get_or_create_ri_instance() - process is already running, pid={self._instance_info.pid}")
                return self._instance_info

            LOGGER.debug(f"_get_or_create_ri_instance() - process does NOT seem to be running, pid={self._instance_info.pid}")

        # Either we don't have a process or the process is dead, so we'll clean up and try to launch a new one
        if self._instance_info and self._instance_info.channel:
            LOGGER.debug(f"_get_or_create_ri_instance() - trying to close existing grpc channel")
            self._instance_info.channel.close()

        self._instance_info = None
        _kill_competing_ri_processes()

        LOGGER.debug(f"_get_or_create_ri_instance() - launching new ResInsight instance")
        new_pid = _launch_ri_instance()
        if new_pid < 0:
            LOGGER.error("Failed to launch ResInsight instance")
            return None

        new_channel: grpc.Channel = grpc.insecure_channel(
            f"localhost:{_RI_PORT}",
            options=[("grpc.enable_http_proxy", False), ("grpc.max_receive_message_length", 64 * 1024 * 1024)],
        )
        if not _probe_grpc_alive(new_channel):
            LOGGER.error("Probe against newly launched ResInsight failed")
            return None

        self._instance_info = _InstanceInfo(pid=new_pid, channel=new_channel)
        LOGGER.debug(f"_get_or_create_ri_instance() - successfully launched new ResInsight instance, pid={self._instance_info.pid}")

        return self._instance_info


def _kill_competing_ri_processes() -> None:

    terminated_procs: list[psutil.Process] = []

    all_processes: Iterator[psutil.Process] = psutil.process_iter(["pid", "ppid", "name", "exe", "cmdline"])
    for proc in all_processes:
        # The info dict gets added by the psutil.process_iter() function
        info_dict = proc.info # type: ignore[attr-defined]
        if info_dict["exe"] == _RI_EXECUTABLE:
            if "--server" in info_dict["cmdline"] and f"{_RI_PORT}" in info_dict["cmdline"]:
                LOGGER.debug(f"Terminating ResInsight process with PID: {info_dict['pid']}")
                proc.terminate()
                terminated_procs.append(proc)

    _gone, alive = psutil.wait_procs(terminated_procs, timeout=5, callback=_on_terminate)
    for proc in alive:
        LOGGER.debug(f"KILLING ResInsight process with PID: {proc.pid}")
        proc.kill()


def _on_terminate(proc: psutil.Process):
    # returncode is added just for this callback, it is not part of the original psutil.Process class
    LOGGER.debug(f"process {proc} terminated with exit code {proc.returncode}") # type: ignore[attr-defined]


def _launch_ri_instance() -> int:
    proc: subprocess.Popen = subprocess.Popen([_RI_EXECUTABLE, "--console", "--server", f"{_RI_PORT}"])

    # Quick and dirty, redirect to our own stdout
    # proc: subprocess.Popen = subprocess.Popen(["stdbuf", "-oL", _RI_EXECUTABLE, "--console", "--server", f"{_RI_PORT}"], stdout=sys.stdout, stderr=sys.stderr, bufsize=1, text=True)

    if not proc:
        return -1

    return proc.pid


def _probe_grpc_alive(channel: grpc.Channel) -> bool:
    app_stub = App_pb2_grpc.AppStub(channel)

    try:
        LOGGER.debug(f"_probe_grpc_alive() - probing ...")
        grpc_response = app_stub.GetVersion(Definitions_pb2.Empty(), timeout=4.0, wait_for_ready=True)
        LOGGER.debug(f"_probe_grpc_alive() - {str(grpc_response)=}")
        return True
    except grpc.RpcError:
        LOGGER.error(f"_probe_grpc_alive() - probe failed!!!")
        pass

    return False



def _launch_ri_instance_try_with_logging() -> int:

    # Currently, does not work without stdbuf -oL
    proc: subprocess.Popen = subprocess.Popen(["stdbuf", "-oL", _RI_EXECUTABLE, "--console", "--server", f"{_RI_PORT}"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, bufsize=1, text=True)

    if not proc:
        return -1

    time.sleep(3)
    LOGGER.info("BEFORE")
    for line in proc.stdout:
        LOGGER.info("got a line")
        LOGGER.info(line) # process line here    
    LOGGER.info("AFTER")


RESINSIGHT_MANAGER = ResInsightManager()
