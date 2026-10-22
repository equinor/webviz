import datetime
import hashlib
import json
import logging
import os
import uuid
from enum import StrEnum
from typing import TypeVar

import httpx
from pydantic import BaseModel, JsonValue
from azure.storage.blob.aio import BlobClient, StorageStreamDownloader
from azure.core.exceptions import ResourceNotFoundError
from fmu.sumo.explorer.explorer import SumoClient

from webviz_core_utils.radix_utils import get_radix_environment_name
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client

# pylint: disable-next=invalid-name
ModelT = TypeVar("ModelT", bound=BaseModel)

LOGGER = logging.getLogger(__name__)


# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# Rename Namespace -> Operation
# Operations have a cache_version, code_version
# Mayby for now just keep it embedded in the string
#
# At runtime:
# (global_)runtime_generation  Generation for all entries in the cache
# runtime_generation, enten per operation, eller per operation,code_version
#


class SumoBlobCache:
    # Well-known cache namespaces used to partition the SumoBlobCache key space.
    class Namespace(StrEnum):
        GENERAL = "general_v1"
        DERIVED_VEC_TABLE = "derivedVecTable_v1"
        QC_CHECKS = "qcChecks_v1"

    def __init__(self, sumo_client: SumoClient, application_name: str, namespace: Namespace) -> None:
        self._sumo_client = sumo_client
        self._application_name = application_name
        self._namespace = namespace

    def compute_cache_key(self, cache_key_data: JsonValue) -> str:
        """
        Creates a cache key by hashing the provided data using shake128 to produce a UUID string.
        The namespace is also embedded in the cache key data to ensure uniqueness across different namespaces.
        """
        # Deterministically serialize the cache key data to get consistent hashing
        serialized_data = json.dumps(cache_key_data, sort_keys=True, separators=(',', ':'), allow_nan=False)

        # Also embed the namespace in the cache key to ensure that cache keys are unique across different namespaces
        string_to_hash = f"{self._namespace}@{serialized_data}"

        digest: bytes = hashlib.shake_128(string_to_hash.encode()).digest(16)
        hash_uuid = uuid.UUID(bytes=digest)
        return str(hash_uuid)

    async def has_cache_entry_async(self, cache_key: str) -> bool:
        sas_url = await self.resolve_cache_entry_async(cache_key)
        if not sas_url:
            return False

        return await self.is_resolved_blob_accessible_async(sas_url)

    async def reserve_cache_entry_async(
        self, cache_key: str, source_obj_uuids: list[str], blob_size: int
    ) -> str | None:
        """
        Reserves a cache entry in Sumo and returns a SAS URL for writing the actual data to Azure blob storage.
        """
        cache_metadata = {
            "operation": self._namespace,
            "inputids": source_obj_uuids,
            "objectsize": blob_size,
        }

        try:
            # Creates a cache entry in Sumo and returns a SAS URL to Azure blob storage for writing actual data
            resp = await self._sumo_client.post_async(f"/cache/{self._application_name}/{cache_key}", json=cache_metadata)
            resp_dict = resp.json()
            sas_url_for_blob_write = resp_dict["authuri"]
            return sas_url_for_blob_write
        except httpx.RequestError as exc:
            LOGGER.error(
                f"Failed to reserve cache entry with request error. (namespace={self._namespace}, POST url={exc.request.url})",
                exc_info=exc,
            )
            return None
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            LOGGER.error(
                f"Failed to reserve cache entry, HTTP status: {status} (namespace={self._namespace}, POST url={exc.request.url})"
            )
            return None

    async def resolve_cache_entry_async(self, cache_key: str) -> str | None:
        """
        Resolves a cache key to a SAS URL for reading the cached blob from Azure blob storage.
        """
        try:
            resp = await self._sumo_client.get_async(f"/cache/{self._application_name}/{cache_key}/blob/authuri")
            sas_url_for_blob_read = resp.text

            # !!!!!!!!!!!!!!!!
            if await self._FAKE_CHECK_is_resolved_blob_stale_async(sas_url_for_blob_read):
                LOGGER.warning("resolve_cache_entry_async() -- FAKE_CHECK says that the blob is stale")
                return None

            return sas_url_for_blob_read

        except httpx.RequestError as exc:
            # Should we raise a service exception or just log an error here?
            # Assuming that caching is a best effort optimization we should probably just log the error and return None
            # which will lead to a cache miss and normal processing of the request.
            LOGGER.error(
                f"Failed to resolve cache entry with request error. (namespace={self._namespace}, GET url={exc.request.url})",
                exc_info=exc,
            )
            return None
        except httpx.HTTPStatusError as exc:
            # SumoClient calls raise_for_status() on the response, so non-success status codes end up here
            # As of now we don't know how to distinguish between these, so we treat them all as normal cache misses
            # but log a warning if it's an unexpected status code
            status = exc.response.status_code
            if status == 404:
                LOGGER.debug(
                    f"Cache miss for: {cache_key=} (namespace={self._namespace}, {status=}, GET url={exc.request.url})"
                )
            else:
                LOGGER.warning(
                    f"Failed to resolve cache entry, unexpected status: {status} (namespace={self._namespace}, GET url={exc.request.url})"
                )
            return None

    async def upload_reserved_blob_async(self, blob_sas_url: str, blob_payload: bytes) -> None:
        if not blob_sas_url:
            raise ValueError("Cannot upload blob to cache, empty SAS URL provided")

        blob_size = len(blob_payload)
        async with BlobClient.from_blob_url(blob_sas_url) as blob_client:
            await blob_client.upload_blob(data=blob_payload, blob_type="BlockBlob", length=blob_size, overwrite=True)

    async def download_resolved_blob_async(self, blob_sas_url: str) -> bytes | None:
        if not blob_sas_url:
            raise ValueError("Cannot download blob from cache, empty SAS URL provided")

        # !!!!!!!!!!!!!!!!
        if await self._FAKE_CHECK_is_resolved_blob_stale_async(blob_sas_url):
            LOGGER.warning("download_resolved_blob_async() -- FAKE_CHECK says that the blob is stale")
            return None

        async with BlobClient.from_blob_url(blob_sas_url) as blob_client:
            try:
                stream_downloader: StorageStreamDownloader[bytes] = await blob_client.download_blob()
                payload: bytes = await stream_downloader.readall()
            except ResourceNotFoundError:
                # The cache entry resolved to a SAS URL, but the underlying blob is not there
                LOGGER.debug("Could not download resolved blob: blob not found, treating as cache miss")
                return None

        return payload

    async def is_resolved_blob_accessible_async(self, blob_sas_url: str) -> bool:
        if not blob_sas_url:
            raise ValueError("Cannot check blob access, empty SAS URL provided")

        # !!!!!!!!!!!!!!!!
        if await self._FAKE_CHECK_is_resolved_blob_stale_async(blob_sas_url):
            LOGGER.warning("is_resolved_blob_accessible_async() -- FAKE_CHECK says that the blob is stale")
            return False

        async with BlobClient.from_blob_url(blob_sas_url) as blob_client:
            try:
                await blob_client.get_blob_properties()
                return True
            except ResourceNotFoundError:
                return False

    async def put_bytes_async(self, cache_key: str, source_obj_uuids: list[str], blob_payload: bytes) -> None:
        blob_size = len(blob_payload)
        blob_sas_url = await self.reserve_cache_entry_async(cache_key, source_obj_uuids, blob_size)
        if blob_sas_url is None:
            raise ValueError("Failed to reserve cache entry, cannot proceed with blob upload")

        await self.upload_reserved_blob_async(blob_sas_url, blob_payload)

    async def get_bytes_async(self, cache_key: str) -> bytes | None:
        blob_sas_url = await self.resolve_cache_entry_async(cache_key)
        if blob_sas_url is None:
            return None

        payload = await self.download_resolved_blob_async(blob_sas_url)
        return payload

    async def put_pydantic_model_async(self, cache_key: str, source_obj_uuids: list[str], model: BaseModel) -> None:
        blob_bytes = model.model_dump_json().encode()
        blob_size = len(blob_bytes)
        blob_sas_url = await self.reserve_cache_entry_async(cache_key, source_obj_uuids, blob_size)
        if blob_sas_url is None:
            raise ValueError("Failed to reserve cache entry, cannot proceed with blob upload")

        await self.upload_reserved_blob_async(blob_sas_url, blob_bytes)

    async def get_pydantic_model_async(self, cache_key: str, model_class: type[ModelT]) -> ModelT | None:
        blob_sas_url = await self.resolve_cache_entry_async(cache_key)
        if blob_sas_url is None:
            return None

        blob_bytes = await self.download_resolved_blob_async(blob_sas_url)
        if blob_bytes is None:
            return None

        model = model_class.model_validate_json(blob_bytes.decode("utf-8"))
        return model


    # !!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!
    # Temporary hack to allow us to simulate the removal of cache entries
    async def _FAKE_CHECK_is_resolved_blob_stale_async(self, blob_sas_url: str) -> bool:

        # !!!!!!
        return False

        # LOGGER.debug("FAKE_CHECK_is_resolved_blob_stale_async() STARTING")
        # if not blob_sas_url:
        #     raise ValueError("_FAKE_CHECK_is_resolved_blob_stale_async() - Cannot check cache blob, empty SAS URL provided")

        # async with BlobClient.from_blob_url(blob_sas_url) as blob_client:
        #     try:
        #         blob_properties = await blob_client.get_blob_properties()
        #         LOGGER.debug("FAKE_CHECK_is_resolved_blob_stale_async() GOT BLOB PROPERTIES:")
        #         LOGGER.debug(f"  creation_time:    {blob_properties.creation_time}")
        #         LOGGER.debug(f"  last_modified:    {blob_properties.last_modified}")
        #         LOGGER.debug(f"  last_accessed_on: {blob_properties.last_accessed_on}")
        #         LOGGER.debug(f"  {blob_properties.metadata=}")

        #         time_diff = datetime.datetime.now(tz=datetime.timezone.utc) - blob_properties.last_modified
        #         time_diff_seconds = time_diff.total_seconds()
        #         if time_diff_seconds > 20:
        #             LOGGER.warning(f"Cache blob has not been accessed for {time_diff_seconds:.2f} seconds, FAKING STALE")
        #             return True
        #         return False
        #     except ResourceNotFoundError:
        #         return True


class SumoBlobCacheFactory:
    _instance = None

    def __init__(self, application_name: str):
        self._application_name: str = application_name

    @classmethod
    def initialize_from_radix_env(cls) -> None:
        if cls._instance is not None:
            raise RuntimeError("SumoBlobCacheFactory is already initialized")

        radix_env_name = get_radix_environment_name()
        if radix_env_name is None:
            raise RuntimeError("Could not determine Radix environment name, must be running on Radix platform.")

        application_name = f"webviz-{radix_env_name}"
        cls._instance = cls(application_name=application_name)

        LOGGER.info(f"SumoBlobCacheFactory initialized from Radix environment: {application_name=}")

    @classmethod
    def initialize_for_local_dev(cls) -> None:
        if cls._instance is not None:
            raise RuntimeError("SumoBlobCacheFactory is already initialized")

        developer_qualifier = os.environ.get("WEBVIZ_LOCAL_DEVELOPER_QUALIFIER", "").strip()
        if not developer_qualifier:
            raise RuntimeError(
                "Environment variable WEBVIZ_LOCAL_DEVELOPER_QUALIFIER must be set for local development."
            )

        application_name = f"webviz-local-{developer_qualifier}"
        cls._instance = cls(application_name=application_name)

        LOGGER.info(f"SumoBlobCacheFactory initialized for local development: {application_name=}")


    @classmethod
    def get_instance(cls) -> "SumoBlobCacheFactory":
        if cls._instance is None:
            raise RuntimeError("SumoBlobCacheFactory is not initialized, call initialize() first")
        return cls._instance

    def get_from_access_token(self, sumo_access_token: str, namespace: SumoBlobCache.Namespace) -> "SumoBlobCache":
        if not sumo_access_token:
            raise ValueError("A sumo_access_token must be specified")

        new_sumo_client = create_sumo_client(sumo_access_token)
        return SumoBlobCache(new_sumo_client, application_name=self._application_name, namespace=namespace)

    def get_from_sumo_client(self, sumo_client: SumoClient, namespace: SumoBlobCache.Namespace) -> "SumoBlobCache":
        if not sumo_client:
            raise ValueError("A sumo_client must be specified")

        return SumoBlobCache(sumo_client, application_name=self._application_name, namespace=namespace)


