from enum import Enum
import logging
from typing import Tuple
import asyncio

import redis
from pottery import Redlock
import httpx

from src import config

from .dev_radix_helpers import IS_RUNNING_IN_RADIX
from .dev_radix_helpers import verify_that_named_radix_job_is_running
from .dev_radix_helpers import create_new_radix_job

from .dev_redis_user_job_dir import RedisUserJobDirectory, JobState

LOGGER = logging.getLogger(__name__)


async def call_endpoint_with_retries(url_to_call: str) -> Tuple[bool, str]:
    LOGGER.debug(f"## call_health_endpoint_with_retries()  {url_to_call=}")

    max_retries = 20
    async with httpx.AsyncClient() as client:
        for i in range(max_retries):
            success, msg_txt = await _call_endpoint(client, url_to_call)
            if success:
                return success, msg_txt
            
            LOGGER.debug(f"  attempt {i} failed with error: {msg_txt=}")
            await asyncio.sleep(1)

    return False, "Failed to call health endpoint"


async def _call_endpoint(client: httpx.AsyncClient, call_health_endpoint_with_retries: str) -> Tuple[bool, str]:
    try:
        response = await client.get(call_health_endpoint_with_retries)
        response.raise_for_status()
        return True, response.text
    except httpx.RequestError as exc:
        return False, f"An error occurred while requesting {exc.request.url!r}"
    except httpx.HTTPStatusError as exc:
        return False, f"Error HTTP status {exc.response.status_code} while requesting {exc.request.url!r}"


"""
async def get_or_create_user_service_url_localdev(user_id: str, job_component_name: str, instance_identifier: str) -> str:
    LOGGER.debug(f"##### get_or_create_user_service_url_localdev()  {job_component_name=}")

    redis_job_dir = RedisUserJobDirectory(user_id)
    job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
    LOGGER.debug(f"{job_info=}")

    if job_info and job_info.state == JobState.RUNNING:
        service_url = f"http://{job_info.radix_job_name}:8001"
        LOGGER.debug(f"Job info found in running state, so returning URL: {service_url=}")
        return service_url

    redis_client = redis_job_dir.get_redis_client()
    lock_key_name: str = redis_job_dir.make_lock_key(job_component_name, instance_identifier)
    my_lock = Redlock(key=lock_key_name, masters={redis_client}, auto_release_time=10, context_manager_timeout=5)

    LOGGER.debug(f"Trying to acquire lock {lock_key_name=}")
    with my_lock:
        redis_job_updater = redis_job_dir.create_job_info_updater(job_component_name, instance_identifier)
        redis_job_updater.delete_all_state()
        await asyncio.sleep(8)
        redis_job_updater.set_state_waiting(job_component_name)
        redis_job_updater.set_state_running()

    job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
    return f"http://{job_info.radix_job_name}:8001"
"""


async def get_or_create_user_service_url(user_id: str, job_component_name: str, instance_identifier: str) -> str | None:
    LOGGER.debug(f"##### get_or_create_user_service_url()  {job_component_name=}")

    redis_job_dir = RedisUserJobDirectory(user_id)
    job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)

    # The job might be in the process of being created, so we will try and wait for it
    # We will need to add a timeout to this!!!!!
    while job_info and job_info.state != JobState.RUNNING:
        LOGGER.debug("Found a matching user job entry, but it's not running so trying to wait")
        await asyncio.sleep(1)
        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)

    if job_info and job_info.state == JobState.RUNNING and job_info.radix_job_name:
        if IS_RUNNING_IN_RADIX:
            LOGGER.debug("Found a matching user job entry, verifying its existence against radix job manager")
            radix_job_is_running = await verify_that_named_radix_job_is_running(job_component_name, 8001, job_info.radix_job_name)
            if radix_job_is_running:
                LOGGER.debug("Job is running in radix, returning its endpoint")
                LOGGER.debug(f"{job_info=}")
                return f"http://{job_info.radix_job_name}:8001"
        else:
            return f"http://{job_info.radix_job_name}:8001"


    # If we get here there is a few scenarios:
    #   1. We found the job, but it's not running yet (it's in the process of being created or has got stuck while being created)
    #   2. We did not find the job in the directory, and it needs to be created
    #   3. We found the job and the job info says it is running, but our radix probe says it's not
    #
    # In all cases we will try and create the job and wait for it to come online, which mans we need to acquire a lock
    redis_client = redis_job_dir.get_redis_client()
    lock_key_name: str = redis_job_dir.make_lock_key(job_component_name, instance_identifier)

    LOGGER.debug(f"Trying to acquire lock {lock_key_name=}")
    my_lock = Redlock(key=lock_key_name, masters={redis_client}, auto_release_time=10, context_manager_timeout=5)
    with my_lock:
        # Now that we have the lock, kill off existing job info and start creating new job
        # Before proceeeding, try and whack the radix job if possible
        """
        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
        if job_info and job_info.radix_job_name:
            # see https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task
            #delete_specific_radix_job()
        """

        redis_job_updater = redis_job_dir.create_job_info_updater(job_component_name, instance_identifier)
        redis_job_updater.delete_all_state()
        redis_job_updater.set_state_creating()

        if IS_RUNNING_IN_RADIX:
            new_radix_job_name = await create_new_radix_job("user-mock", 8001)
            LOGGER.debug(f"Created new job in radix: {new_radix_job_name=}")
            if new_radix_job_name is None:
                LOGGER.error("Failed to create new job in radix")
                redis_job_updater.delete_all_state()
                return None
        
            LOGGER.debug("Radix job created, will try and wait for it to come alive")
            redis_job_updater.set_state_waiting(new_radix_job_name)
        else:
            LOGGER.debug("Running locally, will not create radix job")
            new_radix_job_name = job_component_name

        ready_endpoint = f"http://{new_radix_job_name}:8001/health/ready"
        is_alive, msg = await call_endpoint_with_retries(ready_endpoint)
        if not is_alive:
            LOGGER.error("The newly created radix job failed to come online, giving up and deleting it")
            # Should delete the radix job as well 
            redis_job_updater.delete_all_state()
            return None
        
        redis_job_updater.set_state_running()

        job_info = redis_job_dir.get_job_info(job_component_name, instance_identifier)
        if not job_info:
            LOGGER.error("Failed to get job info after creating new radix job")
            return None

        LOGGER.info(f"New radix job created and online: {job_info.radix_job_name=}")
        return f"http://{job_info.radix_job_name}:8001"




##############################################################################################
##############################################################################################
##############################################################################################
##############################################################################################


"""
def make_job_endpoint_url(radix_job_name: str) -> str:
    return f"http://{radix_job_name}:8001"


class JobInfo(BaseModel):
    state: JobState
    radix_job_name: str | None

class _RedisUserJobManager:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id
        self._redis_client = redis.Redis.from_url(config.REDIS_USER_SESSION_URL, decode_responses=True)

    def set_job_info(self, job_component_name: str, instance_identifier: str, job_info: JobInfo) -> None:
        key = self._make_key(job_component_name, instance_identifier)
        payload = job_info.model_dump_json()
        print(f"{type(payload)=}")
        print(f"{payload=}")

        self._redis_client.set(key, payload)

    def get_job_info(self, job_component_name: str, instance_identifier: str) -> JobInfo | None:
        key = self._make_key(job_component_name, instance_identifier)
        payload = self._redis_client.get(key)
        if payload is None:
            return None
        
        print(f"{type(payload)=}")
        print(f"{payload=}")
        info = JobInfo.model_validate_json(payload)
        print(f"{type(info)=}")
        print(f"{info=}")
        return info

    def get_job_info_arr(self, job_component_name: str) -> List[JobInfo]:
        #pattern = f"user-jobs:{self._user_id}:{job_component_name}:*"
        pattern = f"user-jobs:*:{job_component_name}:*"
        print(f"{pattern=}")
        
        ret_list = []
        for key in self._redis_client.scan_iter(pattern):
            print(f"{key=}")
            payload = self._redis_client.get(key)
            print(f"{payload=}")
            info = JobInfo.model_validate_json(payload)
            ret_list.append(info)

        return ret_list

    def _make_key(self, job_component_name: str, instance_identifier: str) -> str:
        return f"user-jobs:{self._user_id}:{job_component_name}:{instance_identifier}"

"""