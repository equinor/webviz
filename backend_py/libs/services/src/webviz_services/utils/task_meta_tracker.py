import time
import logging
import secrets
from enum import StrEnum
from dataclasses import dataclass

import redis.asyncio as redis

from .authenticated_user import AuthenticatedUser

_REDIS_KEY_PREFIX = "task_meta_tracker"

LOGGER = logging.getLogger(__name__)


class TaskMetaTrackerFactory:
    _instance = None

    def __init__(self, redis_client: redis.Redis):
        self._redis_client: redis.Redis = redis_client

    @classmethod
    def initialize(cls, redis_url: str) -> None:
        if cls._instance is not None:
            raise RuntimeError("TaskMetaTrackerFactory is already initialized")

        redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        cls._instance = cls(redis_client)

    @classmethod
    def get_instance(cls) -> "TaskMetaTrackerFactory":
        if cls._instance is None:
            raise RuntimeError("TaskMetaTrackerFactory is not initialized, call initialize() first")
        return cls._instance

    def get_tracker_for_user_id(self, user_id: str) -> "TaskMetaTracker":
        if not user_id:
            raise ValueError("A user_id must be specified")

        return TaskMetaTracker(user_id, self._redis_client)


class TaskState(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass(frozen=True, kw_only=True)
class TaskMeta:
    task_id: str
    state: TaskState
    status_message: str | None          # Human-readable description of the current or final task status, should be suitable for end-user consumption
    internal_error_message: str | None  # Internal error message for failed tasks, not meant for end-user consumption

    expected_store_key: str | None

    registered_at_utc_s: float          # Time when the task was registered with the task tracker
    updated_at_utc_s: float             # Time when the task was last updated
    started_at_utc_s: float | None      # Time when task execution started
    completed_at_utc_s: float | None    # Time when the task reached a terminal state (succeeded, failed, or cancelled)


class TaskMetaTracker:
    def __init__(self, user_id: str, redis_client: redis.Redis):
        if not user_id:
            raise ValueError("A user_id must be specified")

        self._user_id = user_id
        self._redis_client: redis.Redis = redis_client

    @classmethod
    def generate_task_id(cls, prefix: str | None = None) -> str:
        # Convenience function to generate a task id for use with the tracker, including a custom prefix.
        # 6 random bytes -> 48 bits of entropy, encoded as an 8-character URL-safe string.
        #
        # 8 chars should be enough since task ids are per user and are only ever looked up within that user's
        # namespace, never used as a standalone cross-user access token.
        #
        # May want to bump to secrets.token_urlsafe(9) (72 bits, 12 chars) if a task id ever becomes a security
        # boundary (knowing the id grants access/cancellation across users), or if the number of coexisting task
        # IDs grows into the many-millions range.
        task_id = secrets.token_urlsafe(6)
        if prefix:
            task_id = f"{prefix}_{task_id}"
        return task_id

    async def register_task_async(
        self,
        task_id: str,
        ttl_s: int,
        actual_start_time_utc_s: float | None,
        expected_store_key: str | None,
    ) -> TaskMeta:
        redis_hash_name = self._make_full_redis_key_for_task(task_id)

        time_now_utc_s = time.time()

        state: TaskState = TaskState.PENDING
        registered_at_utc_s = time_now_utc_s
        updated_at_utc_s = time_now_utc_s
        started_at_utc_s: float | None = None

        if actual_start_time_utc_s is not None:
            state = TaskState.RUNNING
            started_at_utc_s = actual_start_time_utc_s

        # Use hsetnx to provoke an error if an entry for this task id already exists
        res = await self._redis_client.hsetnx(name=redis_hash_name, key="state", value=state)
        if res == 0:
            raise ValueError(f"Task with id {task_id} already exists in the tracker")

        # Set TTL for the hash
        await self._redis_client.expire(redis_hash_name, ttl_s)

        update_dict: dict[str, str | float] = {
            "expectedStoreKey": expected_store_key if expected_store_key else "",
            "registeredAtUtcS": registered_at_utc_s,
            "updatedAtUtcS": updated_at_utc_s,
        }

        if started_at_utc_s is not None:
            update_dict["startedAtUtcS"] = started_at_utc_s

        # Now set the remaining keys/fields in the hash
        await self._redis_client.hset(name=redis_hash_name, mapping=update_dict)# type: ignore[arg-type]

        return TaskMeta(
            task_id=task_id,
            state=state,
            status_message=None,
            internal_error_message=None,
            expected_store_key=expected_store_key,
            registered_at_utc_s=registered_at_utc_s,
            updated_at_utc_s=updated_at_utc_s,
            started_at_utc_s=started_at_utc_s,
            completed_at_utc_s=None,
        )

    async def register_task_with_fingerprint_async(
        self,
        task_id: str,
        fingerprint: str,
        ttl_s: int,
        actual_start_time_utc_s: float | None = None,
        expected_store_key: str | None = None,
    ) -> TaskMeta:
        # Register the task itself in the usual way
        task_meta = await self.register_task_async(
            task_id=task_id,
            ttl_s=ttl_s,
            actual_start_time_utc_s=actual_start_time_utc_s,
            expected_store_key=expected_store_key,
        )

        # Register the mapping from task fingerprint to task id
        # It is OK to use the same TTL here even if that means that the fingerprint key may outlive the task meta
        # since we always check for the existence of the actual task meta when looking up by fingerprint.
        fingerprint_redis_key = self._make_full_redis_key_for_fingerprint(fingerprint)
        _res = await self._redis_client.setex(fingerprint_redis_key, ttl_s, task_id)

        return task_meta

    async def get_task_meta_async(self, task_id: str) -> TaskMeta | None:
        redis_hash_name = self._make_full_redis_key_for_task(task_id)
        value_dict: dict[str, str] = await self._redis_client.hgetall(name=redis_hash_name)
        if not value_dict:
            return None

        try:
            task_state = TaskState(value_dict.get("state", ""))
        except ValueError:
            task_state = TaskState.PENDING

        status_message: str | None = value_dict.get("statusMessage")
        if status_message == "":
            status_message = None

        internal_error_message: str | None = value_dict.get("internalErrorMessage")
        if internal_error_message == "":
            internal_error_message = None

        expected_store_key: str | None = value_dict.get("expectedStoreKey")
        if expected_store_key == "":
            expected_store_key = None

        registered_at_utc_s: float = _to_float_safe(value_dict.get("registeredAtUtcS"), 0.0)
        updated_at_utc_s: float = _to_float_safe(value_dict.get("updatedAtUtcS"), 0.0)
        started_at_utc_s: float | None = _to_float_or_none(value_dict.get("startedAtUtcS"))
        completed_at_utc_s: float | None = _to_float_or_none(value_dict.get("completedAtUtcS"))

        return TaskMeta(
            task_id=task_id,
            state=task_state,
            status_message=status_message,
            internal_error_message=internal_error_message,
            expected_store_key=expected_store_key,
            registered_at_utc_s=registered_at_utc_s,
            updated_at_utc_s=updated_at_utc_s,
            started_at_utc_s=started_at_utc_s,
            completed_at_utc_s=completed_at_utc_s,
        )

    async def get_task_meta_by_fingerprint_async(self, fingerprint: str) -> TaskMeta | None:
        task_id = await self._find_task_id_for_fingerprint_async(fingerprint)
        if task_id is None:
            return None

        return await self.get_task_meta_async(task_id)

    async def set_state_async(self, task_id: str, new_state: TaskState, status_message: str | None = None) -> bool:
        return await self._do_set_state_async(
            task_id=task_id,
            new_state=new_state,
            status_message=status_message,
            internal_error_message=None
            )

    async def fail_task_async(self, task_id: str, status_message: str | None = None, internal_error_message: str | None = None) -> bool:
        return await self._do_set_state_async(
            task_id=task_id,
            new_state=TaskState.FAILED,
            status_message=status_message,
            internal_error_message=internal_error_message
            )

    async def set_status_message_async(self, task_id: str, status_message: str) -> bool:
        redis_hash_name = self._make_full_redis_key_for_task(task_id)

        if not await self._redis_client.exists(redis_hash_name):
            # For now, log a warning and ignore the update if the task hash does not exist.
            # Maybe we should raise an error instead to surface potential issues earlier?
            LOGGER.warning(f"set_status_message_async: task hash does not exist, ignoring update ({task_id=})")
            return False

        time_now_utc_s = time.time()

        update_dict = {
            "statusMessage": status_message,
            "updatedAtUtcS": time_now_utc_s,
        }

        await self._redis_client.hset(name=redis_hash_name, mapping=update_dict)# type: ignore[arg-type]

        return True

    async def delete_task_async(self, task_id: str) -> bool:
        """
        Deletes task with the specified task id.
        Returns True if a task was actually deleted, otherwise False
        """
        redis_hash_name = self._make_full_redis_key_for_task(task_id)
        num_deleted = await self._redis_client.delete(redis_hash_name)
        return num_deleted == 1

    async def delete_task_by_fingerprint_async(self, fingerprint: str) -> bool:
        task_id = await self._find_task_id_for_fingerprint_async(fingerprint)
        if task_id is None:
            return False

        await self.delete_fingerprint_to_task_mapping_async(fingerprint)
        return await self.delete_task_async(task_id)

    async def delete_fingerprint_to_task_mapping_async(self, fingerprint: str) -> bool:
        fingerprint_redis_key = self._make_full_redis_key_for_fingerprint(fingerprint)
        num_deleted = await self._redis_client.delete(fingerprint_redis_key)
        return num_deleted == 1

    async def get_task_id_by_fingerprint_async(self, fingerprint: str) -> str | None:
        task_id = await self._find_task_id_for_fingerprint_async(fingerprint)
        if task_id is None:
            return None

        # Verify the actual task entry still exists (it may have expired while the fingerprint key lives on)
        redis_hash_name = self._make_full_redis_key_for_task(task_id)
        if not await self._redis_client.exists(redis_hash_name):
            # We hit a stale fingerprint that maps to a non-existing task.
            # Probably because the task meta expired but the fingerprint key did not
            return None

        return task_id

    async def purge_all_task_meta_async(self) -> None:
        # Purge all existing keys for user by setting their TTL to 1ms
        # Note that this is not atomic, but use it as a first experiment.
        # We should probably go for a solution with versioned namespaces instead.
        pattern = f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:*"
        async for key in self._redis_client.scan_iter(match=pattern):
            await self._redis_client.pexpire(key, 1)

    async def _do_set_state_async(self, task_id: str, new_state: TaskState, status_message: str | None, internal_error_message: str | None) -> bool:
        redis_hash_name = self._make_full_redis_key_for_task(task_id)

        if not await self._redis_client.exists(redis_hash_name):
            # For now, log a warning and ignore the update if the task hash does not exist.
            # Maybe we should raise an error instead to surface potential issues earlier?
            LOGGER.warning(f"_do_set_state_async: task hash does not exist, ignoring update ({task_id=}, {new_state=})")
            return False

        time_now_utc_s = time.time()

        update_dict: dict[str, str | float] = {
            "state": new_state,
            "updatedAtUtcS": time_now_utc_s,
        }

        if new_state == TaskState.RUNNING:
            update_dict["startedAtUtcS"] = time_now_utc_s
        elif new_state in [TaskState.SUCCEEDED, TaskState.FAILED, TaskState.CANCELLED]:
            update_dict["completedAtUtcS"] = time_now_utc_s

        # Clear status message when state changes (unless a new one is provided)
        if status_message is not None:
            update_dict["statusMessage"] = status_message
        else:
            update_dict["statusMessage"] = ""

        if new_state == TaskState.FAILED and internal_error_message is not None:
            update_dict["internalErrorMessage"] = internal_error_message
        else:
            update_dict["internalErrorMessage"] = ""

        await self._redis_client.hset(name=redis_hash_name, mapping=update_dict)# type: ignore[arg-type]

        return True

    async def _find_task_id_for_fingerprint_async(self, fingerprint: str) -> str | None:
        fingerprint_redis_key = self._make_full_redis_key_for_fingerprint(fingerprint)

        # Redis return None if the key does not exist, so we can directly return the result
        task_id = await self._redis_client.get(fingerprint_redis_key)
        return task_id

    def _make_full_redis_key_for_task(self, task_id: str) -> str:
        return f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:task:{task_id}"

    def _make_full_redis_key_for_fingerprint(self, fingerprint: str) -> str:
        return f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:fingerprint_to_task_map:{fingerprint}"


def _to_float_safe(str_value: str | None, default: float) -> float:
    if str_value is None:
        return default

    try:
        return float(str_value)
    except (ValueError, TypeError):
        return default


def _to_float_or_none(str_value: str | None) -> float | None:
    if str_value is None:
        return None

    try:
        return float(str_value)
    except (ValueError, TypeError):
        return None


def get_task_meta_tracker_for_user(authenticated_user: AuthenticatedUser) -> TaskMetaTracker:
    factory = TaskMetaTrackerFactory.get_instance()
    return factory.get_tracker_for_user_id(user_id=authenticated_user.get_user_id())


def get_task_meta_tracker_for_user_id(user_id: str) -> TaskMetaTracker:
    factory = TaskMetaTrackerFactory.get_instance()
    return factory.get_tracker_for_user_id(user_id=user_id)
