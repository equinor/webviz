import asyncio
import io
import os
import logging
import hashlib
import pickle
from dataclasses import dataclass
from typing import Any

import numpy as np
import redis.asyncio as redis
import xtgeo
from dotenv import load_dotenv
from aiocache import BaseCache, RedisCache
from aiocache.serializers import MsgPackSerializer, PickleSerializer
from redis.asyncio.connection import ConnectKwargs, parse_url
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from azure.storage.blob.aio import BlobServiceClient, ContainerClient, StorageStreamDownloader
from azure.storage.blob import ContentSettings

from primary import config

from .authenticated_user import AuthenticatedUser


LOGGER = logging.getLogger(__name__)

load_dotenv()
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")

CONTAINER_NAME = "test-two-level-cache-store"


class UserCache2Level:
    def __init__(self, aio_cache: BaseCache, container_client: ContainerClient, authenticated_user: AuthenticatedUser):
        self._cache = aio_cache
        self._container_client = container_client
        self._authenticated_user_id = authenticated_user.get_user_id()

    def _make_full_key(self, key: str) -> str:
        return f"user:{self._authenticated_user_id}:{key}"

    async def set_Any(self, key: str, obj: Any) -> bool:
        perf_metrics = PerfMetrics()

        payload: bytes = pickle.dumps(obj)
        perf_metrics.record_lap("serialize")

        # We could remove the user id from the key to save space which wil dedupe the blob payloads
        blob_key = f"user:{self._authenticated_user_id}__payload:{_compute_payload_hash(payload)}"
        perf_metrics.record_lap("hash")

        await _upload_blob_if_not_exists(self._container_client, blob_key, payload)
        perf_metrics.record_lap("upload-blob")

        redis_key = self._make_full_key(key)
        await self._cache.set(redis_key, blob_key)
        perf_metrics.record_lap("write-redis")

        size_mb = len(payload)/(1024*1024)
        LOGGER.debug(f"##### set_Any() with payload of {size_mb:.2f}MB took: {perf_metrics.to_string()}")

        return True

    async def get_Any(self, key: str) -> Any:
        perf_metrics = PerfMetrics()
        redis_key = self._make_full_key(key)

        blob_key = await self._cache.get(redis_key)
        perf_metrics.record_lap("read-redis")

        if not blob_key:
            LOGGER.debug(f"##### get_Any() cache miss took: {perf_metrics.to_string()}  [{key=}, {redis_key=}]")
            return None

        payload = await _download_blob(self._container_client, blob_key)
        perf_metrics.record_lap("download-blob")
        if not payload:
            LOGGER.debug(f"##### get_Any() blob miss took: {perf_metrics.to_string()}  [{key=}, {blob_key=}]")
            return None

        try:
            obj = pickle.loads(payload)
            perf_metrics.record_lap("deserialize")
        except Exception as e:
            LOGGER.debug(f"##### get_Any() deserialize failed took: {perf_metrics.to_string()}  [{key=}, {blob_key=}]")
            return None

        size_mb = len(payload)/(1024*1024)
        LOGGER.debug(f"##### get_Any() with with payload of {size_mb:.2f}MB took: {perf_metrics.to_string()}")

        return obj


def _compute_payload_hash(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


async def _upload_blob_if_not_exists(container_client: ContainerClient, blob_key: str, payload: bytes) -> str:
    blob_client = container_client.get_blob_client(blob_key)
    if not await blob_client.exists():
        await blob_client.upload_blob(payload, overwrite=False, content_settings=ContentSettings(content_type='application/octet-stream'))
    return blob_client.url


async def _download_blob(container_client: ContainerClient, blob_key: str) -> bytes | None:
    blob_client = container_client.get_blob_client(blob_key)
    try:
        stream_downloader: StorageStreamDownloader[bytes] = await blob_client.download_blob()
        payload = await stream_downloader.readall()
        return payload
    except Exception as e:
        LOGGER.debug(f"##### _download_blob() exception {e=}")
        return None



_redis_url_options: ConnectKwargs = parse_url(config.REDIS_CACHE_URL)
_aio_cache = RedisCache(endpoint=_redis_url_options["host"], port=_redis_url_options["port"], namespace="perUser2LevelCache", timeout=30, serializer=PickleSerializer())

_blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
_container_client = _blob_service_client.get_container_client(CONTAINER_NAME)


def _ensure_container_is_created():
    from azure.storage.blob import ContainerClient as SyncContainerClient
    sync_container_client = SyncContainerClient.from_connection_string(conn_str=AZURE_STORAGE_CONNECTION_STRING, container_name=CONTAINER_NAME)

    try:
        sync_container_client.create_container()
    except Exception:
        pass  # Container probably already exists
    finally:
        sync_container_client.close()


_ensure_container_is_created()


def get_user_cache(authenticated_user: AuthenticatedUser) -> UserCache2Level:
    return UserCache2Level(_aio_cache, _container_client, authenticated_user)
