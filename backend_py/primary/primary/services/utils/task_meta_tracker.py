import logging
from typing import Literal
from dataclasses import dataclass

import redis.asyncio as redis

from .authenticated_user import AuthenticatedUser


_REDIS_KEY_PREFIX = "task_meta_tracker"


LOGGER = logging.getLogger(__name__)


class TaskMetaTrackerFactory:
    _instance = None

    def __init__(self, redis_client: redis.Redis, ttl_s: int):
        self._redis_client: redis.Redis = redis_client
        self._ttl_s: int = ttl_s

    @classmethod
    def initialize(cls, redis_url: str, ttl_s: int) -> None:
        if cls._instance is not None:
            raise RuntimeError("TaskMetaTrackerFactory is already initialized")

        redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        cls._instance = cls(redis_client, ttl_s)

    @classmethod
    def get_instance(cls) -> "TaskMetaTrackerFactory":
        if cls._instance is None:
            raise RuntimeError("TaskMetaTrackerFactory is not initialized, call initialize() first")
        return cls._instance

    def get_tracker_for_user_id(self, user_id: str) -> "TaskMetaTracker":
        if not user_id:
            raise ValueError("A user_id must be specified")

        return TaskMetaTracker(user_id, self._redis_client, self._ttl_s)


@dataclass(frozen=True, kw_only=True)
class TaskMeta:
    task_system: str
    final_outcome: Literal["success", "failure"] | None = None
    expected_store_key: str | None = None


class TaskMetaTracker:
    def __init__(self, user_id: str, redis_client: redis.Redis, ttl_s: int):
        if not user_id:
            raise ValueError("A user_id must be specified")

        self._user_id = user_id
        self._redis_client: redis.Redis = redis_client
        self._ttl_s: int = ttl_s

    async def register_task_async(self, task_system: str, task_id: str, expected_store_key: str | None) -> None:
        redis_hash_name = self._make_full_redis_key_for_task(task_id)
        
        # Use hsetnx to provoke an error if an entry for this task id already exists
        res = await self._redis_client.hsetnx(name=redis_hash_name, key="taskSystem", value=task_system)
        if res == 0:
            raise ValueError(f"Task with id {task_id} already exists in the tracker")
        
        # Set TTL for the hash
        await self._redis_client.expire(redis_hash_name, self._ttl_s)

        # Now set the remaining keys/fields in the hash
        await self._redis_client.hset(
            name=redis_hash_name, 
            mapping={
                "expectedStoreKey": expected_store_key if expected_store_key else "",
            }
        )

    async def register_task_with_fingerprint_async(self, task_system: str, task_id: str, fingerprint: str, expected_store_key: str | None) -> None:
        # Register the task itself in the usual way
        await self.register_task_async(task_system, task_id, expected_store_key)

        # Register the mapping from task fingerprint to task id
        # May want to set a shorter TTL for this entry
        fingerprint_redis_key = self._make_full_redis_key_for_fingerprint(fingerprint)
        res = await self._redis_client.setex(fingerprint_redis_key, self._ttl_s, task_id)

    async def get_task_meta_async(self, task_id: str) -> TaskMeta | None:
        redis_hash_name = self._make_full_redis_key_for_task(task_id)
        value_dict: dict[str, str] = await self._redis_client.hgetall(name=redis_hash_name)
        if not value_dict:
            return None

        task_system: str = value_dict.get("taskSystem", "UNKNOWN")
        
        expected_store_key: str | None = value_dict.get("expectedStoreKey", None)
        if expected_store_key == "":
            expected_store_key = None

        final_outcome: Literal["success", "failure"] | None = None
        final_outcome_str = value_dict.get("finalOutcome")
        if final_outcome_str == "success":
            final_outcome = "success"
        elif final_outcome_str == "failure":
            final_outcome = "failure"

        return TaskMeta(
            task_system=task_system,
            final_outcome=final_outcome,
            expected_store_key=expected_store_key,
        )
    
    async def delete_fingerprint_to_task_mapping_async(self, fingerprint: str) -> None:
        fingerprint_redis_key = self._make_full_redis_key_for_fingerprint(fingerprint)
        await self._redis_client.delete(fingerprint_redis_key)

    async def get_task_id_by_fingerprint_async(self, fingerprint: str) -> str | None:
        fingerprint_redis_key = self._make_full_redis_key_for_fingerprint(fingerprint)
        task_id = await self._redis_client.get(fingerprint_redis_key)
        return task_id

    def _make_full_redis_key_for_task(self, task_id: str) -> str:
        return f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:task:{task_id}"

    def _make_full_redis_key_for_fingerprint(self, fingerprint: str) -> str:
        return f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:fingerprint_to_task_map:{fingerprint}"


def get_task_meta_tracker_for_user(authenticated_user: AuthenticatedUser) -> TaskMetaTracker:
    factory = TaskMetaTrackerFactory.get_instance()
    return factory.get_tracker_for_user_id(user_id=authenticated_user.get_user_id())

def get_task_meta_tracker_for_user_id(user_id: str) -> TaskMetaTracker:
    factory = TaskMetaTrackerFactory.get_instance()
    return factory.get_tracker_for_user_id(user_id=user_id)
