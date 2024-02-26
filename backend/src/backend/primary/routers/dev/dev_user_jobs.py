import asyncio
import logging
import time
from contextlib import AbstractContextManager
from enum import Enum
from types import TracebackType
from typing import Tuple

import httpx
import redis
from pottery import Redlock, ReleaseUnlockedLock

from src import config

from .dev_radix_helpers import IS_ON_RADIX_PLATFORM
from .dev_radix_helpers import create_new_radix_job
from .dev_radix_helpers import verify_that_named_radix_job_is_running
from .dev_redis_user_job_dir import JobState
from .dev_redis_user_job_dir import RedisUserJobDirectory

LOGGER = logging.getLogger(__name__)


class TimeCounter:
    def __init__(self, duration_s: float) -> None:
        self._start_s = time.perf_counter()
        self._end_s = self._start_s + duration_s

    def elapsed_s(self) -> float:
        return time.perf_counter() - self._start_s

    def remaining_s(self) -> float:
        time_now = time.perf_counter()
        remaining = self._end_s - time_now
        return remaining if remaining > 0 else 0


class LockReleasingContext(AbstractContextManager):
    def __init__(self, acquired_lock: Redlock) -> None:
        self._acquired_lock: Redlock = acquired_lock

        # This will have to go as it is probably expensive
        assert self._acquired_lock.locked()

    def __enter__(self) -> Redlock:
        LOGGER.debug("LockReleasingContext.__enter__()")
        return self._acquired_lock

    def __exit__(
        self, _exc_type: type[BaseException] | None, _exc_value: BaseException | None, _traceback: TracebackType | None
    ) -> bool | None:
        LOGGER.debug("LockReleasingContext.__exit__() ...releasing lock")
        self._acquired_lock.release()

        # What is the correct return value here?
        # If there was an exception, AND we want to suppress it, return True
        return None

        # We may want to silence this exception, but not until we have control
        # try:
        #     self._acquired_lock.release()
        # except ReleaseUnlockedLock:
        #     pass


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


async def get_or_create_user_service_url(
    user_id: str, job_component_name: str, job_scheduler_port: int, instance_identifier: str, actual_service_port: int
) -> str | None:

    LOGGER.debug(f"##### get_or_create_user_service_url()  {job_component_name=}")

    redis_job_dir = RedisUserJobDirectory(user_id)

    job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)

    # Given that we actually found info on the job, we will try and wait for it to come online.
    # The job might be in the process of being created and spinning up, so we will try and wait for it.
    # We will need to add a timeout to this!!!!!
    # How much time should we spend here before giving up and then trying to spin up the job ourselves?
    while job_info and job_info.state != JobState.RUNNING:
        LOGGER.debug("Found a matching user job entry, but it's not running so trying to wait")
        await asyncio.sleep(1)
        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)

    if job_info and job_info.state == JobState.RUNNING and job_info.radix_job_name:
        if IS_ON_RADIX_PLATFORM:
            LOGGER.debug(
                "Found a matching user job entry in directory, verifying its existence against radix job manager"
            )
            radix_job_is_running = await verify_that_named_radix_job_is_running(
                job_component_name, job_scheduler_port, job_info.radix_job_name
            )
            if radix_job_is_running:
                LOGGER.debug(f"{job_info=}")
                service_url = f"http://{job_info.radix_job_name}:{actual_service_port}"
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
            return f"http://{job_info.radix_job_name}:{actual_service_port}"

    # If we get here there is a few scenarios:
    #   1. We found the job, but it's not running yet (it's in the process of being created/spinning up or has got stuck while being created)
    #   2. We did not find the job in the directory, and it needs to be created
    #   3. We found the job and the job info says it is running, but our verification probe against radixsays it's not
    #
    # In all cases we will try and create the job and wait for it to come online, which mans we need to acquire a lock
    redis_client = redis_job_dir.get_redis_client()
    lock_key_name: str = redis_job_dir.make_lock_key(job_component_name, instance_identifier)

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
        """
        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
        if job_info and job_info.radix_job_name:
            # see https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task
            #delete_specific_radix_job()
        """

        redis_job_updater = redis_job_dir.create_job_info_updater(job_component_name, instance_identifier)
        redis_job_updater.delete_all_state()
        redis_job_updater.set_state_creating()

        if IS_ON_RADIX_PLATFORM:
            LOGGER.debug(
                f"Trying to create new job using radix job manager ({job_component_name=}, {job_scheduler_port=})"
            )
            new_radix_job_name = await create_new_radix_job(job_component_name, job_scheduler_port)
            if new_radix_job_name is None:
                LOGGER.error(f"Failed to create new job in radix ({job_component_name=}, {job_scheduler_port=})")
                redis_job_updater.delete_all_state()
                return None

            LOGGER.debug(f"New radix job created, will try and wait for it to come alive {new_radix_job_name=}")
            redis_job_updater.set_state_waiting(new_radix_job_name)
        else:
            LOGGER.debug("Running locally, will not create radix job")

            LOGGER.debug("SIMULATING A LONG OPERATION")
            await asyncio.sleep(7)
            LOGGER.debug("LONG OPERATION FINISHED")

            new_radix_job_name = job_component_name
            redis_job_updater.set_state_waiting(new_radix_job_name)

        LOGGER.debug(f"lock status, {my_lock.locked()=}")

        # We must decide on how long we should wait here before giving up
        # This must be aligned with the auto release time for our lock and also the polling for job info that is done against redis
        ready_endpoint = f"http://{new_radix_job_name}:{actual_service_port}/health/ready"
        is_ready, msg = await call_health_endpoint_with_retries(health_url=ready_endpoint, stop_after_delay_s=30)
        if not is_ready:
            LOGGER.error("The newly created radix job failed to come online, giving up and deleting it")
            # Should delete the radix job as well
            redis_job_updater.delete_all_state()
            return None

        redis_job_updater.set_state_running()

        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
        if not job_info:
            LOGGER.error("Failed to get job info after creating new radix job")
            return None

        if job_info.state != JobState.RUNNING:
            LOGGER.error(
                f"Unexpected state in job info after creating new radix job. Expected state to be running but got {job_info.state=}"
            )
            return None

        if not job_info.radix_job_name:
            LOGGER.error("Unexpected empty radix_job_name in job info after creating new radix job")
            return None

        LOGGER.info(f"New radix job created and online: {job_info.radix_job_name=}")

        return f"http://{job_info.radix_job_name}:{actual_service_port}"
