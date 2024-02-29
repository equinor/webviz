import logging
from dataclasses import dataclass
from enum import Enum

import redis

from src import config

LOGGER = logging.getLogger(__name__)


class SessionRunState(str, Enum):
    CREATING_RADIX_JOB = "CREATING_RADIX_JOB"
    WAITING_TO_COME_ONLINE = "WAITING_TO_COME_ONLINE"
    RUNNING = "RUNNING"


_USER_SESSIONS_REDIS_PREFIX = "user-session"


def _make_redis_hash_name(user_id: str, job_component_name: str, instance_str: str) -> str:
    return f"{_USER_SESSIONS_REDIS_PREFIX}:{user_id}:{job_component_name}:{instance_str}"


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
        return _make_redis_hash_name(
            user_id=self._user_id, job_component_name=self._job_component_name, instance_str=self._instance_str
        )


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
        hash_name = _make_redis_hash_name(
            user_id=self._user_id, job_component_name=job_component_name, instance_str=instance_str
        )
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
            key_parts = key.split(":")
            assert len(key_parts) == 4
            assert key_parts[0] == _USER_SESSIONS_REDIS_PREFIX
            assert key_parts[1] == self._user_id

            matched_job_component_name = key_parts[2]
            matched_instance_identifier = key_parts[3]
            job_info = self.get_session_info(matched_job_component_name, matched_instance_identifier)
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
        hash_name = _make_redis_hash_name(
            user_id=self._user_id, job_component_name=job_component_name, instance_str=instance_str
        )
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
