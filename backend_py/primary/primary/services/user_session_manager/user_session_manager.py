import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Tuple

import httpx
from pottery import Redlock

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._radix_helpers import IS_ON_RADIX_PLATFORM
from ._radix_helpers import create_new_radix_job, RadixResourceRequests
from ._radix_helpers import is_radix_job_running, delete_named_radix_job
from ._user_session_directory import SessionInfo, SessionRunState, UserSessionDirectory
from ._util_classes import LockReleasingContext, TimeCounter
from ._background_tasks import run_in_background_task

LOGGER = logging.getLogger(__name__)


class UserComponent(str, Enum):
    GRID3D_RI = "GRID3D_RI"
    GRID3D_VTK = "GRID3D_VTK"
    MOCK = "MOCK"


@dataclass(frozen=True, kw_only=True)
class _UserSessionDef:
    # fmt:off
    job_component_name: str             # The job's component name in radix, or the service name in docker compose, e.g. "user-mock"
    port: int                           # The port number for the radix job manager AND the actual port of the service. These must be the same for our current docker compose setup
    resource_req: RadixResourceRequests # The resource requests for the radix job
    # fmt:on


_USER_SESSION_DEFS: dict[UserComponent, _UserSessionDef] = {
    UserComponent.MOCK: _UserSessionDef(
        job_component_name="user-mock", port=8001, resource_req=RadixResourceRequests(cpu="100m", memory="200Mi")
    ),
    UserComponent.GRID3D_RI: _UserSessionDef(
        job_component_name="user-grid3d-ri", port=8002, resource_req=RadixResourceRequests(cpu="200m", memory="400Mi")
    ),
    UserComponent.GRID3D_VTK: _UserSessionDef(
        job_component_name="user-grid3d-vtk", port=8003, resource_req=RadixResourceRequests(cpu="200m", memory="400Mi")
    ),
}


class UserSessionManager:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id

    async def get_or_create_session_async(self, user_component: UserComponent, instance_str: str | None) -> str | None:
        timer = PerfTimer()
        LOGGER.debug(f"Get or create user session for: {user_component=}, {instance_str=}")

        session_def = _USER_SESSION_DEFS[user_component]
        effective_instance_str = instance_str if instance_str else "DEFAULT"
        actual_service_port = session_def.port

        session_dir = UserSessionDirectory(self._user_id)

        # Note that currently the timeout values (approx_timeout_s) used here are purely experimental at the moment.
        # We may be able to get some insights from the Radix team on this, but still this will have to
        # be weighed up against how long a timeout is acceptable from a user standpoint.

        existing_session_info = await _get_info_for_running_session(
            session_dir=session_dir,
            job_component_name=session_def.job_component_name,
            job_scheduler_port=session_def.port,
            instance_str=effective_instance_str,
            actual_service_port=actual_service_port,
            approx_timeout_s=40,
        )
        if existing_session_info:
            session_url = f"http://{existing_session_info.radix_job_name}:{actual_service_port}"
            LOGGER.info(
                f"Got existing user session in: {timer.elapsed_ms()}ms ({user_component=}, {instance_str=}, {session_url=})"
            )
            return session_url

        LOGGER.debug(
            f"Unable to get existing user session, starting new session for: {user_component=}, {instance_str=}"
        )
        new_session_info = await _create_new_session(
            session_dir=session_dir,
            job_component_name=session_def.job_component_name,
            job_scheduler_port=session_def.port,
            resource_req=session_def.resource_req,
            instance_str=effective_instance_str,
            actual_service_port=actual_service_port,
            approx_timeout_s=30,
        )

        if not new_session_info:
            LOGGER.error(f"Failed to create new user session for: {user_component=}, {instance_str=}")
            return None

        session_url = f"http://{new_session_info.radix_job_name}:{actual_service_port}"
        LOGGER.info(
            f"Created new user session in: {timer.elapsed_ms()}ms ({user_component=}, {instance_str=}, {session_url=})"
        )

        return session_url


# Look for existing session info, possibly waiting for a partially created session to come online
#
# Reasons why this function may return None
#   1. We found the session, but it's not running yet (it's in the process of being created/spinning
#      up or has got stuck while being created)
#   2. We did not find the session in the directory, and it needs to be created
#   3. We found the session and the info says it is running, but our verification probe against
#      radix or a probe against the service's health endpoint says it's not
async def _get_info_for_running_session(
    session_dir: UserSessionDirectory,
    job_component_name: str,
    job_scheduler_port: int,
    instance_str: str,
    actual_service_port: int,
    approx_timeout_s: float,
) -> SessionInfo | None:

    time_counter = TimeCounter(approx_timeout_s)
    sleep_time_s = 1
    num_calls = 1

    session_info = session_dir.get_session_info(job_component_name, instance_str)
    if not session_info:
        return None

    # Given that we found info on the session and it's not in the running state, we will try and wait for it to come online.
    # The job/session might be in the process of being created and spinning up, so we will try and wait for it.
    # How much time should we spend here before giving up? Currently we just consume an approximate timeout here, and
    # leave it to the caller to decide how much time should be allowed.
    while session_info and session_info.run_state != SessionRunState.RUNNING:
        elapsed_s = time_counter.elapsed_s()
        if elapsed_s + sleep_time_s > approx_timeout_s:
            LOGGER.debug(
                "Giving up waiting for user session to enter running state after {num_calls} failed attempts, time spent: {elapsed_s:.2f}s"
            )
            return None

        num_calls += 1
        LOGGER.debug(f"Waiting for user session to enter running state, attempt {num_calls}")
        await asyncio.sleep(sleep_time_s)
        session_info = session_dir.get_session_info(job_component_name, instance_str)

    # So by now the session either evaporated from the directory, or it has entered the running state
    # Bail out if it is gone or for some reason is missing the crucial radix job name
    if not session_info or not session_info.radix_job_name:
        return None

    if IS_ON_RADIX_PLATFORM:
        LOGGER.debug("Found user session, verifying its existence against radix job manager")
        radix_job_is_running = await is_radix_job_running(
            job_component_name, job_scheduler_port, session_info.radix_job_name
        )
        if not radix_job_is_running:
            LOGGER.debug("Could not find running job in radix job manager")
            return None

        # Can we afford the more extensive live check against the service's health endpoint?
        live_endpoint = f"http://{session_info.radix_job_name}:{actual_service_port}/health/live"
        LOGGER.debug(f"Job is running in radix, probing health endpoint of contained service at: {live_endpoint=}")
        is_ready, msg = await call_health_endpoint(live_endpoint, timeout_s=2)
        if not is_ready:
            LOGGER.debug(f"Contained service seems to be dead {msg=}")
            return None

        LOGGER.debug("Contained service is alive")

    return session_info


# Try and create a new session with a new radix job and wait for it to come online
async def _create_new_session(
    session_dir: UserSessionDirectory,
    job_component_name: str,
    job_scheduler_port: int,
    resource_req: RadixResourceRequests,
    instance_str: str,
    actual_service_port: int,
    approx_timeout_s: float,
) -> SessionInfo | None:

    time_counter = TimeCounter(approx_timeout_s)

    # We're going to be modifying the directory which means we need to acquire a lock
    redis_client = session_dir.get_redis_client()
    lock_key_name: str = session_dir.make_lock_key(job_component_name, instance_str)

    # May have to look closer into the auto release timeout here
    # Using redlock in our case is probably a bit overkill, there's a ready implementation
    # For our use case it may be better to implement our own locking akin to this: https://redis.io/commands/set/#patterns
    LOGGER.debug(f"Trying to acquire distributed redlock {lock_key_name=}")
    distributed_lock = Redlock(key=lock_key_name, masters={redis_client}, auto_release_time=approx_timeout_s + 30)
    got_the_lock = distributed_lock.acquire(blocking=False, timeout=-1)
    if not got_the_lock:
        LOGGER.error(f"Failed to acquire distributed redlock {lock_key_name=}")
        return None

    with LockReleasingContext(distributed_lock):
        # Now that we have the lock, kill off existing job info and start creating new job
        # But before proceeding, grab the old session info so we can try and whack the radix job if possible
        old_session_info = session_dir.get_session_info(job_component_name, instance_str)
        session_info_updater = session_dir.create_session_info_updater(job_component_name, instance_str)
        session_info_updater.delete_all_state()
        session_info_updater.set_state_creating()

        if IS_ON_RADIX_PLATFORM:
            if old_session_info and old_session_info.radix_job_name:
                LOGGER.debug(f"Trying to delete old radix job {old_session_info.radix_job_name=}")
                run_in_background_task(
                    delete_named_radix_job(job_component_name, job_scheduler_port, old_session_info.radix_job_name)
                )

            LOGGER.debug(f"Creating new job using radix job manager ({job_component_name=}, {job_scheduler_port=})")
            new_radix_job_name = await create_new_radix_job(job_component_name, job_scheduler_port, resource_req)
            if new_radix_job_name is None:
                LOGGER.error(f"Failed to create new job in radix ({job_component_name=}, {job_scheduler_port=})")
                session_info_updater.delete_all_state()
                return None

            LOGGER.debug(f"New radix job created, will try and wait for it to come alive {new_radix_job_name=}")
            session_info_updater.set_state_waiting(new_radix_job_name)
        else:
            LOGGER.debug("Running locally, will not create a radix job")
            new_radix_job_name = job_component_name
            session_info_updater.set_state_waiting(new_radix_job_name)

        LOGGER.debug(f"lock status, {distributed_lock.locked()=}")

        # It is a bit hard to decide on how long we should wait here before giving up.
        # This must be aligned with the auto release time for our lock and also the polling for session info that is done against redis
        ready_endpoint = f"http://{new_radix_job_name}:{actual_service_port}/health/ready"
        probe_time_budget_s = time_counter.remaining_s()
        is_ready, msg = await call_health_endpoint_with_retries(ready_endpoint, probe_time_budget_s)
        if not is_ready:
            LOGGER.error("The newly created radix job failed to come online, giving up and deleting it")
            session_info_updater.delete_all_state()
            # Should delete the radix job as well
            run_in_background_task(delete_named_radix_job(job_component_name, job_scheduler_port, new_radix_job_name))
            return None

        session_info_updater.set_state_running()

        session_info = session_dir.get_session_info(job_component_name, instance_str)
        if not session_info:
            LOGGER.error("Failed to get session info after creating new radix job")
            return None

        if session_info.run_state != SessionRunState.RUNNING:
            LOGGER.error(f"Unexpected session info, expected run_state to be running but got {session_info.run_state=}")
            return None

        if not session_info.radix_job_name:
            LOGGER.error("Unexpected empty radix_job_name in session info after creating new radix job")
            return None

        LOGGER.debug(f"New radix job created and online: {session_info.radix_job_name=}")

        return session_info


async def call_health_endpoint_with_retries(health_url: str, stop_after_delay_s: float) -> Tuple[bool, str]:
    LOGGER.debug(f"call_health_endpoint_with_retries() - {health_url=} {stop_after_delay_s=}")

    target_request_timeout_s = 3
    min_request_timeout_s = 1
    sleep_time_s = 1

    time_counter = TimeCounter(stop_after_delay_s)
    num_calls = 0

    async with httpx.AsyncClient(timeout=target_request_timeout_s) as client:
        while True:
            request_timeout_s = min(target_request_timeout_s, max(min_request_timeout_s, time_counter.remaining_s()))
            LOGGER.debug(f"call_health_endpoint_with_retries() - querying endpoint with {request_timeout_s=}")
            success, msg = await _call_health_endpoint_with_client(client, health_url, request_timeout_s)
            num_calls += 1
            if success:
                LOGGER.debug(
                    f"call_health_endpoint_with_retries() - succeeded on attempt {num_calls}, time spent: {time_counter.elapsed_s():.2f}s, {msg=}"
                )
                return success, msg

            LOGGER.debug(f"call_health_endpoint_with_retries() - attempt {num_calls} failed with error: {msg=}")

            elapsed_s = time_counter.elapsed_s()
            if elapsed_s + sleep_time_s + min_request_timeout_s > stop_after_delay_s:
                LOGGER.debug(
                    f"call_health_endpoint_with_retries() - giving up after {num_calls} failed attempts, time spent: {elapsed_s:.2f}s"
                )
                return False, f"Giving up after {num_calls} failed attempts, time spent: {elapsed_s:.2f}s"

            await asyncio.sleep(sleep_time_s)


async def call_health_endpoint(health_url: str, timeout_s: float) -> Tuple[bool, str]:
    async with httpx.AsyncClient() as client:
        return await _call_health_endpoint_with_client(client, health_url, timeout_s)


async def _call_health_endpoint_with_client(
    client: httpx.AsyncClient, health_url: str, timeout_s: float
) -> Tuple[bool, str]:
    try:
        response = await client.get(url=health_url, timeout=timeout_s)
        if response.status_code == 200:
            return True, f"{response.text=}"

        return False, f"{response.status_code=}, {response.text=}"

    except httpx.RequestError as exception:
        return False, f"Request error: {exception=}"
