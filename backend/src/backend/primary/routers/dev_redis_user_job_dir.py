from enum import Enum
import logging
from typing import Tuple
import asyncio
from dataclasses import dataclass

import redis

from src import config

LOGGER = logging.getLogger(__name__)


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
            "state": JobState.RUNNING
        })

    def _make_hash_name(self) -> str:
        return _make_redis_hash_name(user_id=self._user_id, job_component_name=self._job_component_name, instance_identifier=self._instance_identifier)


def _make_redis_hash_name(user_id: str, job_component_name: str, instance_identifier: str | None) -> str:
    return f"user-jobs:{user_id}:{job_component_name}:{instance_identifier}"


@dataclass
class JobInfo:
    state: JobState
    radix_job_name: str | None


class RedisUserJobDirectory:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id
        self._redis_client = redis.Redis.from_url(config.REDIS_USER_SESSION_URL, decode_responses=True)

    def get_job_info(self, job_component_name: str, instance_identifier: str) -> JobInfo | None:
        hash_name = _make_redis_hash_name(user_id=self._user_id, job_component_name=job_component_name, instance_identifier=instance_identifier)
        value_dict = self._redis_client.hgetall(hash_name)
        if not value_dict:
            return None
        
        state_str = value_dict.get("state")
        radix_job_name = value_dict.get("radix_job_name")
        if not state_str:
            return None
        
        state = JobState(state_str)
        return JobInfo(state=state, radix_job_name=radix_job_name) 

    def get_redis_client(self) -> redis.Redis:
        return self._redis_client

    def make_lock_key(self, job_component_name: str, instance_identifier: str) -> str:
        hash_name = _make_redis_hash_name(user_id=self._user_id, job_component_name=job_component_name, instance_identifier=instance_identifier)
        return f"{hash_name}:lock"

    def create_job_info_updater(self, job_component_name: str, instance_identifier: str) -> RedisJobInfoUpdater:
        return RedisJobInfoUpdater(
            redis_client=self._redis_client, 
            user_id=self._user_id, 
            job_component_name=job_component_name, 
            instance_identifier=instance_identifier)



##############################################################################################
##############################################################################################
##############################################################################################
##############################################################################################


"""

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