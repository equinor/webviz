from dataclasses import dataclass
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
from azure.core.exceptions import AzureError, ResourceNotFoundError
from fmu.sumo.explorer.explorer import SumoClient

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_core_utils.radix_utils import get_radix_environment_name
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client

# pylint: disable-next=invalid-name
ModelT = TypeVar("ModelT", bound=BaseModel)

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class VersionedOperation:
    name: str  # Name of the operation
    code_version: int  # Version of the operation's code, including both computation and storage format


# Well-known operations are defined here for now to provide consistency across the codebase.
# Long-term, this is not the best location for these. They should eventually live closer
# to the code that defines and uses them to make it easier and less error-prone to maintain,
# especially when the operation definitions evolve over time.
OP_GENERAL = VersionedOperation("general", 1)
OP_COMBINED_VECTOR_TABLE = VersionedOperation("combinedVecTable", 1)
OP_QC_CHECKS = VersionedOperation("qcChecks", 1)


class SumoBlobCacheError(Exception):
    """
    A cache operation failed or returned an invalid service response.
    """


class SumoBlobCache:
    """
    Implements interface to Sumo's blob caching service

    Cache keys are computed based on the following:
        * input data
        * the application name
        * the versioned operation (op name + op code version)
        * the global and per-operation runtime generations

    Cached blobs or cache misses are returned normally while SumoBlobCacheError is raised on unexpected failures.

    Note on runtime generation numbers:
        * global_runtime_generation is a number that can be changed when there is a need for invalidating all the
          currently cached data.
        * operation_runtime_generation is a number that can be changed whenever there is a need for invalidating
          all cached data for a specific operation.

    Currently the runtime generation numbers must be provided via environment variables. This means that any changes
    to these numbers require updating the corresponding environment variables and restarting the application to take effect.
    There is an additional logistical consideration in that the environment variables must be updated in concert between all
    relevant Radix componets. See initialization of SumoBlobCacheFactor.

    """

    def __init__(
        self,
        sumo_client: SumoClient,
        app_name: str,
        global_runtime_generation: int,
        versioned_op: VersionedOperation,
        op_runtime_generation: int,
    ) -> None:
        self._sumo_client = sumo_client
        self._app_name = app_name
        self._op_name = versioned_op.name
        self._op_identity = f"{versioned_op.name}_v{versioned_op.code_version}_gg{global_runtime_generation}_og{op_runtime_generation}"

    def compute_cache_key(self, cache_key_data: JsonValue) -> str:
        """
        Creates a cache key by hashing the provided data using shake128 to produce a UUID string.

        The app name, versioned operation and runtime generations are also embedded to ensure uniqueness.
        """
        # Deterministically serialize the cache key data to get consistent hashing
        serialized_data = json.dumps(cache_key_data, sort_keys=True, separators=(",", ":"), allow_nan=False)

        # Also embed the app name and the full operation identity (which includes runtime generations) in the cache key
        str_for_hashing = f"{self._app_name}@{self._op_identity}@{serialized_data}"

        digest: bytes = hashlib.shake_128(str_for_hashing.encode()).digest(16)
        hash_uuid = uuid.UUID(bytes=digest)
        return str(hash_uuid)

    async def has_cache_entry_async(self, cache_key: str) -> bool:
        sas_url = await self.resolve_cache_entry_async(cache_key)
        if not sas_url:
            return False

        return await self.is_resolved_blob_accessible_async(sas_url)

    async def reserve_cache_entry_async(self, cache_key: str, source_obj_uuids: list[str], blob_size: int) -> str:
        """
        Reserves a cache entry in Sumo and returns a SAS URL for writing the actual data to Azure blob storage.

        Important note!!
        It is important that the list of source object UUIDs in source_obj_uuids is accurate and that they correctly
        represent the input objects that were used to generate the data that is being stored in the cache.
        """
        perf_metrics = PerfMetrics()

        cache_metadata = {
            "operation": self._op_name,
            "inputids": source_obj_uuids,
            "objectsize": blob_size,
        }

        try:
            # Creates a cache entry in Sumo and returns a SAS URL to Azure blob storage for writing actual data
            resp = await self._sumo_client.post_async(f"/cache/{self._app_name}/{cache_key}", json=cache_metadata)
        except httpx.RequestError as exc:
            raise SumoBlobCacheError(
                f"Failed to reserve cache entry due to request error. (op_identity={self._op_identity}, POST url={exc.request.url})"
            ) from exc
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            raise SumoBlobCacheError(
                f"Failed to reserve cache entry, HTTP status: {status} (op_identity={self._op_identity}, POST url={exc.request.url})"
            ) from exc

        resp_dict = resp.json()
        sas_url_for_blob_write = resp_dict["authuri"].strip()

        LOGGER.debug(f"reserve_cache_entry_async() took: {perf_metrics.to_string()} (op_identity={self._op_identity})")

        return sas_url_for_blob_write

    async def resolve_cache_entry_async(self, cache_key: str) -> str | None:
        """
        Resolves a cache key to a SAS URL for reading the cached blob from Azure blob storage.
        """
        perf_metrics = PerfMetrics()

        try:
            resp = await self._sumo_client.get_async(f"/cache/{self._app_name}/{cache_key}/blob/authuri")

        except httpx.RequestError as exc:
            # Should we raise an exception or swallow it and just log an error here?
            # For now we raise since classifying a request error as a cache miss is a bit risky, as it
            # will mask underlying connectivity issues or misconfigurations.
            raise SumoBlobCacheError(
                f"Failed to resolve cache entry due to request error. (op_identity={self._op_identity}, GET url={exc.request.url})"
            ) from exc
        except httpx.HTTPStatusError as exc:
            # SumoClient calls raise_for_status() on the response, so non-success status codes end up here.
            # As of now we don't know how to distinguish between these, so for now treat 404 as normal cache misse
            # and raise for other status codes.
            status = exc.response.status_code
            if status == 404:
                LOGGER.debug(
                    f"Cache miss for: {cache_key=} (op_identity={self._op_identity}, GET url={exc.request.url})"
                )
                return None
            else:
                raise SumoBlobCacheError(
                    f"Failed to resolve cache entry, unexpected status: {status} (op_identity={self._op_identity}, GET url={exc.request.url})"
                ) from exc

        sas_url_for_blob_read = resp.text

        # !!!!!!!!!!!!!!!!
        if await self._FAKE_CHECK_is_resolved_blob_stale_async(sas_url_for_blob_read):
            LOGGER.warning("resolve_cache_entry_async() -- FAKE_CHECK says that the blob is stale")
            return None

        LOGGER.debug(f"resolve_cache_entry_async() took: {perf_metrics.to_string()} (op_identity={self._op_identity})")
    
        return sas_url_for_blob_read






    async def upload_reserved_blob_async(self, blob_sas_url: str, blob_payload: bytes) -> None:
        if not blob_sas_url:
            raise ValueError("Cannot upload blob to cache, empty SAS URL provided")

        blob_size = len(blob_payload)
        try:
            async with BlobClient.from_blob_url(blob_sas_url) as bclient:
                await bclient.upload_blob(data=blob_payload, blob_type="BlockBlob", length=blob_size, overwrite=True)

        except AzureError as exc:
            raise SumoBlobCacheError(f"Failed to upload blob (op_identity={self._op_identity})") from exc

    async def download_resolved_blob_async(self, blob_sas_url: str) -> bytes | None:
        if not blob_sas_url:
            raise ValueError("Cannot download blob from cache, empty SAS URL provided")

        # !!!!!!!!!!!!!!!!
        if await self._FAKE_CHECK_is_resolved_blob_stale_async(blob_sas_url):
            LOGGER.warning("download_resolved_blob_async() -- FAKE_CHECK says that the blob is stale")
            return None

        try:
            async with BlobClient.from_blob_url(blob_sas_url) as bclient:
                stream_downloader: StorageStreamDownloader[bytes] = await bclient.download_blob()
                payload: bytes = await stream_downloader.readall()
                return payload

        except ResourceNotFoundError:
            # The cache entry resolved, but the underlying blob is no longer there.
            LOGGER.debug("Could not download resolved blob: blob not found, treating as cache miss")
            return None
        except AzureError as exc:
            raise SumoBlobCacheError(f"Failed to download blob (op_identity={self._op_identity})") from exc

    async def is_resolved_blob_accessible_async(self, blob_sas_url: str) -> bool:
        if not blob_sas_url:
            raise ValueError("Cannot check blob access, empty SAS URL provided")

        # !!!!!!!!!!!!!!!!
        if await self._FAKE_CHECK_is_resolved_blob_stale_async(blob_sas_url):
            LOGGER.warning("is_resolved_blob_accessible_async() -- FAKE_CHECK says that the blob is stale")
            return False

        try:
            async with BlobClient.from_blob_url(blob_sas_url) as bclient:
                await bclient.get_blob_properties()
                return True

        except ResourceNotFoundError:
            return False
        except AzureError as exc:
            raise SumoBlobCacheError(f"Failed to check blob access (op_identity={self._op_identity})") from exc

    async def put_bytes_async(self, cache_key: str, source_obj_uuids: list[str], blob_payload: bytes) -> None:
        blob_size = len(blob_payload)
        blob_sas_url = await self.reserve_cache_entry_async(cache_key, source_obj_uuids, blob_size)
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
        await self.upload_reserved_blob_async(blob_sas_url, blob_bytes)

    async def get_pydantic_model_async(self, cache_key: str, model_class: type[ModelT]) -> ModelT | None:
        blob_sas_url = await self.resolve_cache_entry_async(cache_key)
        if blob_sas_url is None:
            return None

        blob_bytes = await self.download_resolved_blob_async(blob_sas_url)
        if blob_bytes is None:
            return None

        return model_class.model_validate_json(blob_bytes)

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

    def __init__(self, app_name: str, global_runtime_generation: int, operation_runtime_generations_dict: dict):
        self._app_name: str = app_name
        self._global_runtime_generation = global_runtime_generation
        self._operation_runtime_generations_dict = operation_runtime_generations_dict

    @classmethod
    def initialize_from_radix_env(cls) -> None:
        if cls._instance is not None:
            raise RuntimeError("SumoBlobCacheFactory is already initialized")

        radix_env_name = get_radix_environment_name()
        if radix_env_name is None:
            raise RuntimeError("Could not determine Radix environment name, must be running on Radix platform.")

        app_name = f"webviz-{radix_env_name}"
        glob_rt_generation = _global_runtime_generation_from_env()
        op_rt_generations_dict = _operation_runtime_generations_from_env()
        cls._instance = cls(app_name, glob_rt_generation, op_rt_generations_dict)

        LOGGER.info(
            f"SumoBlobCacheFactory initialized from Radix environment: {app_name=}, {glob_rt_generation=}, {op_rt_generations_dict=}"
        )

    @classmethod
    def initialize_for_local_dev(cls) -> None:
        if cls._instance is not None:
            raise RuntimeError("SumoBlobCacheFactory is already initialized")

        developer_qualifier = os.environ.get("WEBVIZ_LOCAL_DEVELOPER_QUALIFIER", "").strip()
        if not developer_qualifier:
            raise RuntimeError("Environment variable WEBVIZ_LOCAL_DEVELOPER_QUALIFIER is needed for local development.")

        app_name = f"webviz-local-{developer_qualifier}"
        glob_rt_generation = _global_runtime_generation_from_env()
        op_rt_generations_dict = _operation_runtime_generations_from_env()
        cls._instance = cls(app_name, glob_rt_generation, op_rt_generations_dict)

        LOGGER.info(
            f"SumoBlobCacheFactory initialized for local development: {app_name=}, {glob_rt_generation=}, {op_rt_generations_dict=}"
        )

    @classmethod
    def get_instance(cls) -> "SumoBlobCacheFactory":
        if cls._instance is None:
            raise RuntimeError("SumoBlobCacheFactory is not initialized, call initialize() first")
        return cls._instance

    def get_from_sumo_client(self, sumo_client: SumoClient, versioned_op: VersionedOperation) -> "SumoBlobCache":
        if not sumo_client:
            raise ValueError("A sumo_client must be specified")

        op_runtime_generation = self._operation_runtime_generations_dict.get(versioned_op.name, 0)

        return SumoBlobCache(
            sumo_client,
            app_name=self._app_name,
            global_runtime_generation=self._global_runtime_generation,
            versioned_op=versioned_op,
            op_runtime_generation=op_runtime_generation,
        )

    def get_from_access_token(self, sumo_access_token: str, versioned_op: VersionedOperation) -> "SumoBlobCache":
        if not sumo_access_token:
            raise ValueError("A sumo_access_token must be specified")

        new_sumo_client = create_sumo_client(sumo_access_token)
        return self.get_from_sumo_client(new_sumo_client, versioned_op)


def get_sumo_blob_cache_from_sumo_client(sumo_client: SumoClient, versioned_op: VersionedOperation) -> SumoBlobCache:
    factory = SumoBlobCacheFactory.get_instance()
    return factory.get_from_sumo_client(sumo_client=sumo_client, versioned_op=versioned_op)


def get_sumo_blob_cache_from_access_token(sumo_access_token: str, versioned_op: VersionedOperation) -> SumoBlobCache:
    factory = SumoBlobCacheFactory.get_instance()
    return factory.get_from_access_token(sumo_access_token=sumo_access_token, versioned_op=versioned_op)


def _global_runtime_generation_from_env() -> int:
    """
    Reads from env var: WEBVIZ_SUMO_CACHE_GLOBAL_RUNTIME_GENERATION

    Should be a non-negative integer (default 0).
    Increment the value to invalidate all operations in the application's blob cache.
    """
    env_name = "WEBVIZ_SUMO_CACHE_GLOBAL_RUNTIME_GENERATION"
    try:
        global_generation = int(os.getenv(env_name, "0"))
    except ValueError as exc:
        raise ValueError(f"{env_name} must be a non-negative integer") from exc

    if global_generation < 0:
        raise ValueError(f"{env_name} must be a non-negative integer")

    return global_generation


def _operation_runtime_generations_from_env() -> dict[str, int]:
    """
    Reads from env var: WEBVIZ_SUMO_CACHE_OPERATION_RUNTIME_GENERATIONS

    Env var should contain a JSON object mapping operation names to non-negative integers.
    For example:
        {"derivedVecTable": 1, "qcChecks": 2}

    Incrementing an operation's generation invalidates all its code versions.
    """
    env_name = "WEBVIZ_SUMO_CACHE_OPERATION_RUNTIME_GENERATIONS"
    try:
        generations_dict = json.loads(os.getenv(env_name, "{}"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{env_name} must be a JSON object") from exc

    if not isinstance(generations_dict, dict):
        raise ValueError(f"{env_name} must be a JSON object")

    for generation_val in generations_dict.values():
        if type(generation_val) is not int or generation_val < 0:
            raise ValueError(f"{env_name} must be a JSON object of non-negative integers")

    return generations_dict
