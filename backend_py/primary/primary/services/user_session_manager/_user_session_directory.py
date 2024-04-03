import logging
from dataclasses import dataclass
from enum import Enum

import redis

from primary import config

LOGGER = logging.getLogger(__name__)


class SessionRunState(str, Enum):
    CREATING_RADIX_JOB = "CREATING_RADIX_JOB"
    WAITING_TO_COME_ONLINE = "WAITING_TO_COME_ONLINE"
    RUNNING = "RUNNING"


_USER_SESSIONS_REDIS_PREFIX = "user-session"


@dataclass(frozen=True, kw_only=True)
class JobAddress:
    user_id: str
    job_component_name: str
    instance_str: str


def _encode_redis_hash_name_str(address: JobAddress) -> str:
    if not address.user_id:
        raise ValueError("address.user_id cannot be empty")
    if address.user_id.find(":") != -1:
        raise ValueError("address.user_id cannot contain ':'")

    return f"{_USER_SESSIONS_REDIS_PREFIX}:{address.user_id}:{address.job_component_name}:{address.instance_str}"


def _decode_redis_hash_name_str(hash_name_str: str) -> JobAddress:
    key_parts = hash_name_str.split(":")
    if len(key_parts) != 4:
        raise ValueError(f"Unexpected hash_name_str format {hash_name_str=}")
    if key_parts[0] != _USER_SESSIONS_REDIS_PREFIX:
        raise ValueError(f"Unexpected hash_name_str format, wrong prefix, {hash_name_str=}")
    if not key_parts[1]:
        raise ValueError(f"Unexpected hash_name_str format, empty user_id, {hash_name_str=}")
    if not key_parts[2]:
        raise ValueError(f"Unexpected hash_name_str format, empty job_component_name, {hash_name_str=}")

    return JobAddress(user_id=key_parts[1], job_component_name=key_parts[2], instance_str=key_parts[3])


class SessionInfoUpdater:
    def __init__(self, redis_client: redis.Redis, user_id: str, job_component_name: str, instance_str: str) -> None:
        self._redis_client = redis_client
        self._user_id = user_id
        self._job_component_name = job_component_name
        self._instance_str = instance_str

    def delete_all_state(self) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.delete(hash_name)

    def set_state_creating(self) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.hset(
            name=hash_name,
            mapping={
                "state": SessionRunState.CREATING_RADIX_JOB,
                "radix_job_name": "",
            },
        )

    def set_state_waiting(self, radix_job_name: str) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.hset(
            name=hash_name,
            mapping={
                "state": SessionRunState.WAITING_TO_COME_ONLINE,
                "radix_job_name": radix_job_name,
            },
        )

    def set_state_running(self) -> None:
        hash_name = self._make_hash_name()
        self._redis_client.hset(
            name=hash_name,
            mapping={
                "state": SessionRunState.RUNNING,
            },
        )

    def _make_hash_name(self) -> str:
        addr = JobAddress(
            user_id=self._user_id, job_component_name=self._job_component_name, instance_str=self._instance_str
        )
        return _encode_redis_hash_name_str(addr)


@dataclass(frozen=True, kw_only=True)
class SessionInfo:
    job_component_name: str
    instance_str: str
    run_state: SessionRunState
    radix_job_name: str | None


class UserSessionDirectory:
    def __init__(self, user_id: str) -> None:
        self._user_id = user_id
        self._redis_client = redis.Redis.from_url(config.REDIS_USER_SESSION_URL, decode_responses=True)

    def get_session_info(self, job_component_name: str, instance_str: str) -> SessionInfo | None:
        addr = JobAddress(user_id=self._user_id, job_component_name=job_component_name, instance_str=instance_str)
        hash_name = _encode_redis_hash_name_str(addr)
        value_dict = self._redis_client.hgetall(name=hash_name)
        if not value_dict:
            return None

        state_str = value_dict.get("state")
        radix_job_name = value_dict.get("radix_job_name")
        if not state_str:
            return None

        run_state = SessionRunState(state_str)
        return SessionInfo(
            job_component_name=job_component_name,
            instance_str=instance_str,
            run_state=run_state,
            radix_job_name=radix_job_name,
        )

    def get_session_info_arr(self, job_component_name: str | None) -> list[SessionInfo]:
        if job_component_name is None:
            job_component_name = "*"

        pattern = f"{_USER_SESSIONS_REDIS_PREFIX}:{self._user_id}:{job_component_name}:*"
        LOGGER.debug(f"Redis scan pattern pattern {pattern=}")

        ret_list: list[SessionInfo] = []
        for key in self._redis_client.scan_iter(pattern):
            LOGGER.debug(f"{key=}")
            job_address = _decode_redis_hash_name_str(key)
            if job_address.user_id != self._user_id:
                raise ValueError(f"Unexpected key format, mismatch in user_id {key=}")
            matched_job_component_name = job_address.job_component_name
            matched_instance_str = job_address.instance_str
            job_info = self.get_session_info(matched_job_component_name, matched_instance_str)
            if job_info is not None:
                ret_list.append(job_info)

        return ret_list

    def delete_session_info(self, job_component_name: str | None) -> None:
        if job_component_name is None:
            job_component_name = "*"

        pattern = f"{_USER_SESSIONS_REDIS_PREFIX}:{self._user_id}:{job_component_name}:*"
        LOGGER.debug(f"Redis scan pattern pattern {pattern=}")

        key_list = []
        for key in self._redis_client.scan_iter(pattern):
            LOGGER.debug(f"{key=}")
            key_list.append(key)

        self._redis_client.delete(*key_list)

    def make_lock_key(self, job_component_name: str, instance_str: str) -> str:
        addr = JobAddress(user_id=self._user_id, job_component_name=job_component_name, instance_str=instance_str)
        hash_name = _encode_redis_hash_name_str(addr)
        return f"{hash_name}:lock"

    def create_session_info_updater(self, job_component_name: str, instance_str: str) -> SessionInfoUpdater:
        return SessionInfoUpdater(
            redis_client=self._redis_client,
            user_id=self._user_id,
            job_component_name=job_component_name,
            instance_str=instance_str,
        )

    def get_redis_client(self) -> redis.Redis:
        return self._redis_client
