from enum import Enum

import redis

from src import config



class JobState(str, Enum):
    CREATING_RADIX_JOB = "CREATING_RADIX_JOB"
    WAITING_TO_COME_ONLINE = "WAITING_TO_COME_ONLINE"
    RUNNING = "RUNNING"


class RedisJobInfoUpdater:
    state: JobState
    radix_job_name: str | None

    def __init__(self, redis_client: redis.Redis, user_id: str, job_component_name: str, instance_identifier: str | None) -> None:
        self._redis_client = redis_client
        self._user_id = user_id
        self._job_component_name = job_component_name
        self._instance_identifier = instance_identifier

    def delete_all_state(self) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.delete(hash_name)

    def set_state_creating(self) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.hset(name=hash_name, mapping={
            "state": JobState.CREATING_RADIX_JOB,
            "radix_job_name": ""
        }) 

    def set_state_waiting(self, radix_job_name: str) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.hset(name=hash_name, mapping={
            "state": JobState.WAITING_TO_COME_ONLINE,
            "radix_job_name": radix_job_name
        })

    def set_state_running(self) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.hset(name=hash_name, mapping={
            "state": JobState.WAITING_TO_COME_ONLINE
        })

    def _make_hash_name(self) -> str:
        return f"user-jobs:{self._user_id}:{self._job_component_name}:{self._instance_identifier}"


class RedisUserJobDirectory:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id
        self._redis_client = redis.Redis.from_url(config.REDIS_USER_SESSION_URL, decode_responses=True)




##############################################################################################
##############################################################################################
##############################################################################################
##############################################################################################



def make_job_endpoint_url(radix_job_name: str) -> str:
    return f"http://{radix_job_name}:8001"








async def get_or_create_user_service_url(user_id: str, job_component_name: str, instance_identifier: str) -> str:
    redis_user_jobs = _RedisUserJobManager(user_id)

    job_info = redis_user_jobs.get_job_info(job_component_name, instance_identifier)

    # The job might be in the process of being created, so we will try and wait for it
    # We will need to add a timeout to this!!
    while job_info and job_info.state != JobState.RUNNING:
        print("##### Found a matching user job entry, but it's not running so trying to wait")
        await asyncio.sleep(1)
        job_info = redis_user_jobs.get_job_info(job_component_name, instance_identifier)

    if job_info and job_info.state == JobState.RUNNING_READY:
        print("##### Found a matching user job entry, verifying its existence against radix job manager")
        radix_job_is_running = await verify_that_named_radix_job_is_running(job_component_name, 8001, job_info.radix_job_name)
        if radix_job_is_running:
            print("##### Job is running in radix, returning its endpoint")
            print(f"{job_info=}")
            return make_job_endpoint_url(job_info.radix_job_name)

    # If we get here there is a few scenarios:
    #   1. We found the job, but it's not running yet (it's in the process of being created or has got stuck while being created)
    #   2. We did not find the job in the directory, and it needs to be created
    #   3. We found the job and the job info says it is running, but our radix probe says it's not
    #
    # In all cases we will try and create the job and wait for it to come online, which mans we need to aquire a lock
    
    # Now that we have the lock, kill off existing job info and start creating new job
    # Before proceeeding, try and whack the radix job if possible
    job_info = redis_user_jobs.get_job_info(job_component_name, instance_identifier)
    if job_info and job_info.radix_job_name:
        # see https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task
        #delete_specific_radix_job()

    job_info_updater = RedisJobInfoUpdater(None, None, None, None)
    job_info_updater.delete_all_state()
    job_info_updater.set_state_creating()

    async with httpx.AsyncClient() as client:
        if IS_RUNNING_IN_RADIX:
            print("##### Creating job in radix")
            radix_job_manager_url = f"http://{job_component_name}:8001/api/v1/jobs"
            response = await client.post(
                url=radix_job_manager_url,
                json={
                    "resources": {
                        "limits": {"memory": "500M", "cpu": "100m"},
                        "requests": {"memory": "500M", "cpu": "100m"},
                    }
                },
            )

            response_dict = response.json() 
            print("------")
            print(response_dict)
            print("------")

            print("##### Radix job created, will try and wait for it to come alive")

            radix_job_name = response_dict["name"]
            job_info_updater.set_state_waiting(radix_job_name)
        else:
            print("##### Running locally, will not create radix job")
            job_info.radix_job_name = job_component_name
            job_info_updater.set_state_waiting(radix_job_name)

        call_url = make_job_endpoint_url(job_info.radix_job_name)
        resp_text = await call_endpoint_with_retries(call_url)

        if resp_text is not None:
            job_info.state = JobState.RUNNING_READY
            redis_user_jobs.set_job_info(job_component_name, instance_identifier, job_info)

    if job_info.state == JobState.RUNNING_READY:
        return make_job_endpoint_url(job_info.radix_job_name)
    
    return None







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



