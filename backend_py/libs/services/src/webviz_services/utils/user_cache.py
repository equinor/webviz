import logging
from typing import TypeVar, Literal
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import msgpack
import redis.asyncio as redis
from pydantic import BaseModel

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.utils.authenticated_user import AuthenticatedUser

_REDIS_KEY_PREFIX = "user_cache"


LOGGER = logging.getLogger(__name__)

# pylint: disable-next=invalid-name
ModelT = TypeVar("ModelT", bound=BaseModel)


class UserCacheFactory:
    _instance = None

    def __init__(
        self,
        redis_url: str,
        shared_redis_client: redis.Redis | None,
    ):
        self._redis_url: str = redis_url
        self._shared_redis_client: redis.Redis | None = shared_redis_client

    @classmethod
    def initialize(cls, use_shared_client: bool, redis_url: str) -> None:
        if cls._instance is not None:
            raise RuntimeError("UserCacheFactory is already initialized")

        shared_redis_client: redis.Redis | None = None

        if use_shared_client:
            # This is the most optimal configuration for Redis, but it will not work in all our
            # scenarios, particularly when wrapping asynchronous code and in Celery using asyncio.run()
            shared_redis_client = redis.Redis.from_url(redis_url, decode_responses=False)

        cls._instance = cls(
            redis_url=redis_url,
            shared_redis_client=shared_redis_client,
        )

    @classmethod
    def get_instance(cls) -> "UserCacheFactory":
        if cls._instance is None:
            raise RuntimeError("UserCacheFactory is not initialized, call initialize() first")
        return cls._instance

    def get_cache_for_user_id(self, user_id: str) -> "UserCache":
        if not user_id:
            raise ValueError("A user_id must be specified")

        return UserCache(
            user_id=user_id,
            redis_url=self._redis_url,
            shared_redis_client=self._shared_redis_client,
        )


class UserCache:
    def __init__(
        self,
        user_id: str,
        redis_url: str,
        shared_redis_client: redis.Redis | None,
    ):
        if not user_id:
            raise ValueError("A user_id must be specified")

        self._user_id = user_id
        self._redis_url: str = redis_url
        self._shared_redis_client: redis.Redis | None = shared_redis_client

    async def put_bytes_async(self, key: str, payload: bytes, ttl_s: int) -> bool:
        perf_metrics = PerfMetrics()

        redis_key = self._make_full_redis_key(key)
        async with self._goc_redis_client_async() as redis_client:
            await redis_client.setex(redis_key, ttl_s, payload)

        perf_metrics.record_lap("write-redis")

        size_mb = len(payload) / (1024 * 1024)
        LOGGER.debug(f"##### put_bytes() with payload of {size_mb:.2f}MB took: {perf_metrics.to_string()}")

        return True

    async def get_bytes_async(self, key: str) -> bytes | None:
        perf_metrics = PerfMetrics()

        redis_key = self._make_full_redis_key(key)
        LOGGER.debug(f"##### get_bytes() {redis_key=}")

        async with self._goc_redis_client_async() as redis_client:
            payload = await redis_client.get(redis_key)
        perf_metrics.record_lap("read-redis")

        if not payload:
            LOGGER.debug(f"##### get_bytes() cache miss took: {perf_metrics.to_string()}  [{key=}]")
            return None

        size_mb = len(payload) / (1024 * 1024)
        LOGGER.debug(f"##### get_bytes() with with payload of {size_mb:.2f}MB took: {perf_metrics.to_string()}")

        return payload

    async def put_pydantic_model_async(
        self, key: str, model: BaseModel, ser_fmt: Literal["msgpack", "json"], ttl_s: int
    ) -> bool:
        perf_metrics = PerfMetrics()

        payload: bytes
        if ser_fmt == "msgpack":
            payload = _pydantic_to_msgpack(model)
        elif ser_fmt == "json":
            payload = model.model_dump_json().encode("utf-8")
        else:
            raise ValueError(f"Unsupported serialization format: {ser_fmt}")

        perf_metrics.record_lap("serialize")

        ret_val = await self.put_bytes_async(key, payload, ttl_s)
        perf_metrics.record_lap("put-bytes")

        size_mb = len(payload) / (1024 * 1024)
        LOGGER.debug(f"##### put_pydantic() with payload of {size_mb:.2f}MB took: {perf_metrics.to_string()}")

        return ret_val

    async def get_pydantic_model_async(
        self, key: str, model_class: type[ModelT], ser_fmt: Literal["msgpack", "json"]
    ) -> ModelT | None:
        perf_metrics = PerfMetrics()

        payload = await self.get_bytes_async(key)
        perf_metrics.record_lap("get-bytes")
        if not payload:
            LOGGER.debug(f"##### get_pydantic() cache miss took: {perf_metrics.to_string()}  [{key=}]")
            return None

        try:
            if ser_fmt == "msgpack":
                model = _msgpack_to_pydantic(model_class, payload)
            elif ser_fmt == "json":
                model = model_class.model_validate_json(payload.decode("utf-8"))
            else:
                raise ValueError(f"Unsupported serialization format: {ser_fmt}")
        except Exception as e:
            raise ValueError(f"Failed to deserialize model {key=}, {ser_fmt=}: {e}") from e

        perf_metrics.record_lap("deserialize")

        size_mb = len(payload) / (1024 * 1024)
        LOGGER.debug(f"##### get_pydantic() with with payload of {size_mb:.2f}MB took: {perf_metrics.to_string()}")

        return model

    @asynccontextmanager
    async def _goc_redis_client_async(self) -> AsyncIterator[redis.Redis]:
        if self._shared_redis_client:
            yield self._shared_redis_client
        else:
            client: redis.Redis = redis.Redis.from_url(self._redis_url, decode_responses=True)
            try:
                yield client
            finally:
                await client.aclose()

    def _make_full_redis_key(self, key: str) -> str:
        return f"{_REDIS_KEY_PREFIX}:user:{self._user_id}:{key}"


def _pydantic_to_msgpack(model: BaseModel) -> bytes:
    return msgpack.packb(model.model_dump(), use_bin_type=True)


def _msgpack_to_pydantic(model_class: type[ModelT], data: bytes) -> ModelT:
    return model_class(**msgpack.unpackb(data, raw=False))


def get_user_cache_for_user(authenticated_user: AuthenticatedUser) -> UserCache:
    """
    Convenience function to get a UserCache instance for the specified authenticated user.
    """
    factory = UserCacheFactory.get_instance()
    return factory.get_cache_for_user_id(authenticated_user.get_user_id())


def get_user_cache_for_user_id(user_id: str) -> UserCache:
    factory = UserCacheFactory.get_instance()
    return factory.get_cache_for_user_id(user_id)
