import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Tuple

import httpx
from pottery import Redlock

from src.services.utils.perf_timer import PerfTimer

from ._radix_helpers import (IS_ON_RADIX_PLATFORM, create_new_radix_job,
                             verify_that_named_radix_job_is_running)
from ._user_session_directory import (SessionInfo, SessionRunState,
                                      UserSessionDirectory)
from ._util_classes import LockReleasingContext, TimeCounter

LOGGER = logging.getLogger(__name__)


class UserComponent(str, Enum):
    GRID3D_RI = "GRID3D_RI"
    MOCK = "MOCK"


@dataclass(frozen=True, kw_only=True)
class _UserSessionDef:
    job_component_name: (
        str  # The job's component name in radix, or the service name in docker compose, e.g. "user-mock"
    )
    port: int  # The port number for the radix job manager AND the actual port of the service. These must be the same for our current docker compose setup


_USER_SESSION_DEFS: dict[UserComponent, _UserSessionDef] = {
    UserComponent.MOCK: _UserSessionDef(job_component_name="user-mock", port=8001),
    UserComponent.GRID3D_RI: _UserSessionDef(job_component_name="user-grid3d-ri", port=8002),
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

        existing_session_info = await _get_info_for_running_session(
            session_dir=session_dir,
            job_component_name=session_def.job_component_name,
            job_scheduler_port=session_def.port,
            instance_str=effective_instance_str,
            actual_service_port=actual_service_port,
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
            instance_str=effective_instance_str,
            actual_service_port=actual_service_port,
        )

        if not new_session_info:
            LOGGER.error(f"Failed to create new user session for: {user_component=}, {instance_str=}")
            return None

        session_url = f"http://{new_session_info.radix_job_name}:{actual_service_port}"
        LOGGER.info(
            f"Created new user session in: {timer.elapsed_ms()}ms ({user_component=}, {instance_str=}, {session_url=})"
        )

        return session_url

        # session_url = await get_or_create_user_session_url(
        #     user_id=self._user_id,
        #     job_component_name=session_def.job_component_name,
        #     job_scheduler_port=session_def.port,
        #     instance_identifier=effective_instance_str,
        #     actual_service_port=session_def.port,
        # )

        # LOGGER.debug(f"get_or_create_session_async() {session_url=}")
        # LOGGER.debug(f"get_or_create_session_async() took: {timer.elapsed_ms()}ms")

        # return session_url


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
) -> SessionInfo | None:

    session_info = session_dir.get_session_info(job_component_name, instance_str)
    if not session_info:
        return None

    # Given that we found info on the session and it's not in the running state, we will try and wait for it to come online.
    # The job/session might be in the process of being created and spinning up, so we will try and wait for it.
    # We will need to add a timeout to this!!!!!
    # How much time should we spend here before giving up?
    while session_info and session_info.run_state != SessionRunState.RUNNING:
        LOGGER.debug("Found user session, but it's not running so trying to wait...")
        await asyncio.sleep(1)
        session_info = session_dir.get_session_info(job_component_name, instance_str)

    # So by now the session either evaporated from the directory, or it has entered the running state
    # Bail out if it is gone or for some reason is missing the crucial radix job name
    if not session_info or not session_info.radix_job_name:
        return None

    assert session_info.run_state == SessionRunState.RUNNING
    assert session_info.radix_job_name is not None

    if IS_ON_RADIX_PLATFORM:
        LOGGER.debug("Found user session, verifying its existence against radix job manager")
        radix_job_is_running = await verify_that_named_radix_job_is_running(
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
    instance_str: str,
    actual_service_port: int,
) -> SessionInfo | None:

    # We're going to be modifying the directory which means we need to acquire a lock
    redis_client = session_dir.get_redis_client()
    lock_key_name: str = session_dir.make_lock_key(job_component_name, instance_str)

    # !!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!
    # Need much longer auto release timeout here !!!!!!!!!!!!!!
    # Using redlock in our case is a bit overkill, but it's a good way to learn how to use it and there's a ready implementation
    # For our use case it is probably better to implement our own locking akin to this: https://redis.io/commands/set/#patterns
    #
    #
    LOGGER.debug(f"Trying to acquire distributed redlock {lock_key_name=}")
    distributed_lock = Redlock(key=lock_key_name, masters={redis_client}, auto_release_time=60)
    got_the_lock = distributed_lock.acquire(blocking=False, timeout=-1)
    if not got_the_lock:
        LOGGER.error(f"Failed to acquire distributed redlock {lock_key_name=}")
        return None

    with LockReleasingContext(distributed_lock):
        # Now that we have the lock, kill off existing job info and start creating new job
        # Before proceeding, try and whack the radix job if possible
        """
        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
        if job_info and job_info.radix_job_name:
            # see https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task
            #delete_specific_radix_job()
        """

        session_info_updater = session_dir.create_session_info_updater(job_component_name, instance_str)
        session_info_updater.delete_all_state()
        session_info_updater.set_state_creating()

        if IS_ON_RADIX_PLATFORM:
            LOGGER.debug(
                f"Trying to create new job using radix job manager ({job_component_name=}, {job_scheduler_port=})"
            )
            new_radix_job_name = await create_new_radix_job(job_component_name, job_scheduler_port)
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

        # We must decide on how long we should wait here before giving up
        # This must be aligned with the auto release time for our lock and also the polling for job info that is done against redis
        ready_endpoint = f"http://{new_radix_job_name}:{actual_service_port}/health/ready"
        is_ready, msg = await call_health_endpoint_with_retries(health_url=ready_endpoint, stop_after_delay_s=30)
        if not is_ready:
            LOGGER.error("The newly created radix job failed to come online, giving up and deleting it")
            # !!!!!!!!!!
            # Should delete the radix job as well
            session_info_updater.delete_all_state()
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


"""
async def get_or_create_user_session_url(
    user_id: str, job_component_name: str, job_scheduler_port: int, instance_identifier: str, actual_service_port: int
) -> str | None:

    LOGGER.debug(f"##### get_or_create_user_session_url()  {job_component_name=}")

    session_dir = UserSessionDirectory(user_id)

    session_info = session_dir.get_session_info(job_component_name, instance_identifier)

    # Given that we actually found info on the session, we will try and wait for it to come online.
    # The job/session might be in the process of being created and spinning up, so we will try and wait for it.
    # We will need to add a timeout to this!!!!!
    # How much time should we spend here before giving up and then trying to spin up the job ourselves?
    while session_info and session_info.state != SessionState.RUNNING:
        LOGGER.debug("Found a matching user job entry, but it's not running so trying to wait")
        await asyncio.sleep(1)
        session_info = session_dir.get_session_info(job_component_name, instance_identifier)

    if session_info and session_info.state == SessionState.RUNNING and session_info.radix_job_name:
        if IS_ON_RADIX_PLATFORM:
            LOGGER.debug("Found matching user session in directory, verifying its existence against radix job manager")
            radix_job_is_running = await verify_that_named_radix_job_is_running(
                job_component_name, job_scheduler_port, session_info.radix_job_name
            )
            if radix_job_is_running:
                LOGGER.debug(f"{session_info=}")
                service_url = f"http://{session_info.radix_job_name}:{actual_service_port}"
                # LOGGER.debug("Job is running in radix, returning its endpoint")
                # return service_url

                # Can we afford the more extensive live check against the service's health endpoint?
                live_endpoint = f"{service_url}/health/live"
                LOGGER.debug(f"Job is running in radix, trying to probe service health endpoint at {live_endpoint=}")
                is_ready, msg = await call_health_endpoint(live_endpoint, timeout_s=2)
                if is_ready:
                    LOGGER.debug("Service is alive, returning its endpoint")
                    return service_url
                else:
                    LOGGER.debug(f"Service seems to be dead, so will try and start a new radix job {msg=}")
            else:
                LOGGER.debug(
                    "Could not find running job in radix radix job manager so will try and start a new radix job"
                )
        else:
            return f"http://{session_info.radix_job_name}:{actual_service_port}"

    # If we get here there is a few scenarios:
    #   1. We found the session, but it's not running yet (it's in the process of being created/spinning up or has got stuck while being created)
    #   2. We did not find the session in the directory, and it needs to be created
    #   3. We found the session and the info says it is running, but our verification probe against radixsays it's not
    #
    # In all cases we will try and create the job and wait for it to come online, which mans we need to acquire a lock
    redis_client = session_dir.get_redis_client()
    lock_key_name: str = session_dir.make_lock_key(job_component_name, instance_identifier)

    # !!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!
    # Need much longer auto release timeout here !!!!!!!!!!!!!!
    # Using redlock in our case is a bit overkill, but it's a good way to learn how to use it and there's a ready implementation
    # For our use case it is probably better to implement our own locking akn to this: https://redis.io/commands/set/#patterns
    #
    #
    LOGGER.debug(f"Trying to acquire distributed lock {lock_key_name=}")
    my_lock = Redlock(key=lock_key_name, masters={redis_client}, auto_release_time=60)
    got_the_lock = my_lock.acquire(blocking=False, timeout=-1)
    LOGGER.info(f"!!!!!!!!!!!!!!!!!!!!!!!!!!! {type(got_the_lock)=}   {got_the_lock=}")
    if not got_the_lock:
        LOGGER.error(f"Failed to acquire lock {lock_key_name=}")
        return None

    time_remaining = my_lock.locked()
    LOGGER.debug(f"!!!!!!!!!!!!!!!!!!!!!!!!!!!Lock acquired, {time_remaining=}")

    with LockReleasingContext(my_lock):
        # Now that we have the lock, kill off existing job info and start creating new job
        # Before proceeding, try and whack the radix job if possible
        # job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
        # if job_info and job_info.radix_job_name:
        #     # see https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task
        #     #delete_specific_radix_job()

        session_info_updater = session_dir.create_session_info_updater(job_component_name, instance_identifier)
        session_info_updater.delete_all_state()
        session_info_updater.set_state_creating()

        if IS_ON_RADIX_PLATFORM:
            LOGGER.debug(
                f"Trying to create new job using radix job manager ({job_component_name=}, {job_scheduler_port=})"
            )
            new_radix_job_name = await create_new_radix_job(job_component_name, job_scheduler_port)
            if new_radix_job_name is None:
                LOGGER.error(f"Failed to create new job in radix ({job_component_name=}, {job_scheduler_port=})")
                session_info_updater.delete_all_state()
                return None

            LOGGER.debug(f"New radix job created, will try and wait for it to come alive {new_radix_job_name=}")
            session_info_updater.set_state_waiting(new_radix_job_name)
        else:
            LOGGER.debug("Running locally, will not create radix job")

            LOGGER.debug("SIMULATING A LONG OPERATION")
            await asyncio.sleep(7)
            LOGGER.debug("LONG OPERATION FINISHED")

            new_radix_job_name = job_component_name
            session_info_updater.set_state_waiting(new_radix_job_name)

        LOGGER.debug(f"lock status, {my_lock.locked()=}")

        # We must decide on how long we should wait here before giving up
        # This must be aligned with the auto release time for our lock and also the polling for job info that is done against redis
        ready_endpoint = f"http://{new_radix_job_name}:{actual_service_port}/health/ready"
        is_ready, msg = await call_health_endpoint_with_retries(health_url=ready_endpoint, stop_after_delay_s=30)
        if not is_ready:
            LOGGER.error("The newly created radix job failed to come online, giving up and deleting it")
            # Should delete the radix job as well
            session_info_updater.delete_all_state()
            return None

        session_info_updater.set_state_running()

        session_info = session_dir.get_session_info(job_component_name, instance_identifier)
        if not session_info:
            LOGGER.error("Failed to get job info after creating new radix job")
            return None

        if session_info.state != SessionState.RUNNING:
            LOGGER.error(
                f"Unexpected state in job info after creating new radix job. Expected state to be running but got {session_info.state=}"
            )
            return None

        if not session_info.radix_job_name:
            LOGGER.error("Unexpected empty radix_job_name in session info after creating new radix job")
            return None

        LOGGER.info(f"New radix job created and online: {session_info.radix_job_name=}")

        return f"http://{session_info.radix_job_name}:{actual_service_port}"
"""


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
            success, msg = await _call_health_endpoint(client, health_url, request_timeout_s)
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
        return await _call_health_endpoint(client, health_url, timeout_s)


async def _call_health_endpoint(client: httpx.AsyncClient, health_url: str, timeout_s: float) -> Tuple[bool, str]:
    try:
        response = await client.get(url=health_url, timeout=timeout_s)
        if response.status_code == 200:
            return True, f"{response.text=}"

        return False, f"{response.status_code=}, {response.text=}"

    except httpx.RequestError as exception:
        return False, f"Request error: {exception=}"
