from enum import Enum
import logging
import os

from dataclasses import dataclass
import asyncio
import aiofiles
import aiofiles.os
import httpx
from azure.storage.blob.aio import BlobClient

from webviz_pkg.core_utils.background_tasks import run_in_background_task
from webviz_pkg.core_utils.perf_timer import PerfTimer
from webviz_pkg.core_utils.time_countdown import TimeCountdown

LOGGER = logging.getLogger(__name__)


_CACHE_ROOOT_DIR = "/home/appuser/blob_cache"

_blob_keys_in_flight: set[str] = set()


class DownloadResult(Enum):
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    ABANDONED = "ABANDONED"


@dataclass(frozen=True, kw_only=True)
class _BlobItem:
    object_uuid: str
    blob_kind: str
    file_suffix: str


class LocalBlobCache:
    def __init__(self, sas_token: str, blob_store_base_uri: str) -> None:
        self._sas_token = sas_token
        self._blob_store_base_uri = blob_store_base_uri
        self._cache_root_dir = _CACHE_ROOOT_DIR
        self._timeout = 60

        os.makedirs(self._cache_root_dir, exist_ok=True)

    async def ensure_grid_blob_downloaded_async(self, object_uuid: str) -> str | None:
        return await self._ensure_blob_downloaded(object_uuid, "GRID", ".roff")

    async def ensure_property_blob_downloaded_async(self, object_uuid: str) -> str | None:
        return await self._ensure_blob_downloaded(object_uuid, "PROPERTY", ".roff")

    async def _ensure_blob_downloaded(self, object_uuid: str, blob_kind: str, file_suffix: str) -> str | None:
        blob_item = _BlobItem(object_uuid=object_uuid, blob_kind=blob_kind, file_suffix=file_suffix)
        blob_key = _make_local_blob_filename(blob_item)
        local_blob_path = self._make_local_blob_path(blob_item)

        # If the blob is already in the cache, we can return immediately
        if await self._is_blob_in_cache(blob_item):
            LOGGER.debug(f"Found {blob_kind} blob in cache, returning immediately: {local_blob_path}")
            return local_blob_path

        # We don't have the blob in our local cache yet, so we'll need to download it
        # Provided that no download of this blob is in progress, we'll start one
        if not blob_key in _blob_keys_in_flight:
            LOGGER.debug(f"Starting download of {blob_kind} blob {object_uuid=}")
            _blob_keys_in_flight.add(blob_key)
            try:
                # dl_res = await self._download_blob_simple(blob_item)
                dl_res = await self._download_blob_using_ms_client_lib(blob_item)
                # dl_res = await self._download_blob_with_queued_writer(blob_item)
            finally:
                _blob_keys_in_flight.discard(blob_key)

            if dl_res == DownloadResult.FAILED:
                LOGGER.error(f"Failed to download {blob_kind} blob {object_uuid=}")
                return None
            elif dl_res == DownloadResult.ABANDONED:
                LOGGER.debug(f"Download of {blob_kind} blob was abandoned, returning from cache: {local_blob_path}")
                return local_blob_path

            LOGGER.debug(f"Returning downloaded {blob_kind} blob: {local_blob_path}")
            return local_blob_path

        # A download of this blob is already in progress, we'll try and wait for it to finish
        time_countdown = TimeCountdown(duration_s=self._timeout, action_interval_s=2)
        LOGGER.debug(f"Download of {blob_kind} blob is already in progress, waiting for it to finish {object_uuid=}")
        while blob_key in _blob_keys_in_flight and not time_countdown.is_finished():
            if time_countdown.is_action_due():
                LOGGER.debug(
                    f"  - waiting for {blob_kind} blob {object_uuid} to appear ({time_countdown.elapsed_s():.1f}s elapsed)"
                )

            await asyncio.sleep(0.2)
            if await self._is_blob_in_cache(blob_item):
                LOGGER.debug(f"While waiting for {blob_kind} blob it appeared in cache, returning: {local_blob_path}")
                return local_blob_path

        if not blob_key in _blob_keys_in_flight:
            LOGGER.error(f"The {blob_kind} blob download we were waiting finished but no data is visible in cache")
            return None

        LOGGER.error(f"Timed out while waiting for {blob_kind} blob to appear in cache")
        return None

    async def _download_blob_simple(self, blob_item: _BlobItem) -> DownloadResult:
        object_uuid = blob_item.object_uuid
        blob_kind = blob_item.blob_kind
        local_blob_filename = _make_local_blob_filename(blob_item)
        local_blob_path = self._make_local_blob_path(blob_item)

        timer = PerfTimer()
        num_bytes_downloaded = 0
        num_bytes_written = 0
        url = f"{self._blob_store_base_uri}/{object_uuid}?{self._sas_token}"

        async with aiofiles.tempfile.NamedTemporaryFile(prefix=f"{local_blob_filename}__", delete=False) as tmp_file:
            # Apparently (from the typings) the name attribute may be a file descriptor, but we don't handle that
            if isinstance(tmp_file.name, int):
                raise TypeError("Temporary file with file descriptor as name is not supported")
            tmp_blob_path: str = os.fsdecode(tmp_file.name)

            LOGGER.debug(f"Downloading {blob_kind} blob into temp file: {tmp_blob_path}")
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                try:
                    async with client.stream("GET", url=url) as response:
                        response.raise_for_status()
                        total_size_bytes = int(response.headers["Content-Length"])
                        total_size_mb = total_size_bytes / (1024 * 1024)

                        # What should we do about chunk size here?
                        # Leave it to the content or force a higher value?
                        async for chunk in response.aiter_bytes(chunk_size=5 * 1024 * 1024):
                            await tmp_file.write(chunk)
                            num_bytes_in_chunk = len(chunk)
                            num_bytes_written += num_bytes_in_chunk
                            num_mb_written = num_bytes_written / (1024 * 1024)
                            LOGGER.debug(
                                f"  - downloading {blob_kind} blob {object_uuid}  {num_mb_written:.2f}MB of {total_size_mb:.2f}MB  {num_bytes_in_chunk=}  {tmp_blob_path=}"
                            )

                        num_bytes_downloaded = response.num_bytes_downloaded

                # Need to refine exceptions here
                except Exception as exception:
                    LOGGER.error(f"Failed to download {blob_kind} blob {object_uuid=} {exception=}")
                    return DownloadResult.FAILED

        core_download_time_s = timer.elapsed_s()

        # Has the finished product appeared in the meantime?
        if await self._is_blob_in_cache(blob_item):
            LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, stopping")
            run_in_background_task(_try_delete_temp_file(tmp_blob_path))
            return DownloadResult.ABANDONED

        try:
            LOGGER.debug(f"Rename/move tmp file; {tmp_blob_path=} {local_blob_path=}")
            await aiofiles.os.rename(tmp_blob_path, local_blob_path)
        except Exception as exception:
            LOGGER.error(f"Failed to move temp {blob_kind} blob into cache {object_uuid=} {exception=}")
            run_in_background_task(_try_delete_temp_file(tmp_blob_path))
            return DownloadResult.FAILED

        dl_size_mb = num_bytes_downloaded / (1024 * 1024)
        dl_speed_mbs = dl_size_mb / core_download_time_s
        LOGGER.info(
            f"Downloaded {blob_kind} blob in {timer.elapsed_s():.2f}s  [{dl_speed_mbs:.2f}MB/s, {dl_size_mb:.2f}MB, ImplSimple, {local_blob_path=}]"
        )

        return DownloadResult.SUCCEEDED

    async def _download_blob_using_ms_client_lib(self, blob_item: _BlobItem) -> DownloadResult:
        object_uuid = blob_item.object_uuid
        blob_kind = blob_item.blob_kind
        local_blob_filename = _make_local_blob_filename(blob_item)
        local_blob_path = self._make_local_blob_path(blob_item)

        timer = PerfTimer()
        num_bytes_downloaded = 0
        full_blob_url = f"{self._blob_store_base_uri}/{object_uuid}?{self._sas_token}"

        async with aiofiles.tempfile.NamedTemporaryFile(prefix=f"{local_blob_filename}__", delete=False) as tmp_file:
            if isinstance(tmp_file.name, int):
                raise TypeError("Temporary file with file descriptor as name is not supported")
            tmp_blob_path: str = os.fsdecode(tmp_file.name)
            LOGGER.debug(f"Downloading {blob_kind} blob into temp file: {tmp_blob_path}")

            async def progress_hook(current: int, total: int) -> None:
                num_mb_downloaded = current / (1024 * 1024)
                total_size_mb = total / (1024 * 1024)
                LOGGER.debug(
                    f"  - downloading {blob_kind} blob {object_uuid}  {num_mb_downloaded:.2f}MB of {total_size_mb:.2f}MB"
                )

            async with BlobClient.from_blob_url(blob_url=full_blob_url) as blob_client:
                stream_downloader = await blob_client.download_blob(max_concurrency=16, progress_hook=progress_hook)
                the_bytes = await stream_downloader.readall()
                await tmp_file.write(the_bytes)
                num_bytes_downloaded = len(the_bytes)

        core_download_time_s = timer.elapsed_s()

        if await self._is_blob_in_cache(blob_item):
            LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, stopping")
            run_in_background_task(_try_delete_temp_file(tmp_blob_path))
            return DownloadResult.ABANDONED

        try:
            LOGGER.debug(f"Rename/move tmp file; {tmp_blob_path=} {local_blob_path=}")
            await aiofiles.os.rename(tmp_blob_path, local_blob_path)
        except Exception as exception:
            LOGGER.error(f"Failed to move temp {blob_kind} blob into cache {object_uuid=} {exception=}")
            run_in_background_task(_try_delete_temp_file(tmp_blob_path))
            return DownloadResult.FAILED

        dl_size_mb = num_bytes_downloaded / (1024 * 1024)
        dl_speed_mbs = dl_size_mb / core_download_time_s
        LOGGER.info(
            f"Downloaded {blob_kind} blob in {timer.elapsed_s():.2f}s  [{dl_speed_mbs:.2f}MB/s, {dl_size_mb:.2f}MB, ImplMSClientLib, {local_blob_path=}]"
        )

        return DownloadResult.SUCCEEDED

    async def _download_blob_with_queued_writer(self, blob_item: _BlobItem) -> DownloadResult:
        object_uuid = blob_item.object_uuid
        blob_kind = blob_item.blob_kind
        local_blob_filename = _make_local_blob_filename(blob_item)
        local_blob_path = self._make_local_blob_path(blob_item)

        async def chunk_writer_worker(target_async_file_like, chunk_queue):
            num_bytes_written = 0
            while True:
                chunk_bytes = await chunk_queue.get()
                await target_async_file_like.write(chunk_bytes)
                chunk_queue.task_done()

                num_bytes_written += len(chunk_bytes)
                num_mb_written = num_bytes_written / (1024 * 1024)
                LOGGER.debug(f"  -     writing {blob_kind} blob {object_uuid}  {num_mb_written:.2f}MB")

        timer = PerfTimer()
        num_bytes_downloaded = 0
        url = f"{self._blob_store_base_uri}/{object_uuid}?{self._sas_token}"

        async with aiofiles.tempfile.NamedTemporaryFile(prefix=f"{local_blob_filename}__", delete=False) as tmp_file:
            # Apparently (from the typings) the name attribute may be a file descriptor, but we don't handle that
            if isinstance(tmp_file.name, int):
                raise TypeError("Temporary file with file descriptor as name is not supported")
            tmp_blob_path: str = os.fsdecode(tmp_file.name)

            chunk_queue = asyncio.Queue()
            writer_task = asyncio.create_task(chunk_writer_worker(tmp_file, chunk_queue))

            LOGGER.debug(f"Downloading {blob_kind} blob into temp file: {tmp_blob_path}")
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                try:
                    async with client.stream("GET", url=url) as response:
                        response.raise_for_status()
                        total_size_bytes = int(response.headers["Content-Length"])
                        total_size_mb = total_size_bytes / (1024 * 1024)

                        async for chunk in response.aiter_bytes(chunk_size=5 * 1024 * 1024):
                            num_bytes_downloaded += len(chunk)
                            num_mb_downloaded = num_bytes_downloaded / (1024 * 1024)
                            LOGGER.debug(
                                f"  - downloading {blob_kind} blob {object_uuid}  {num_mb_downloaded:.2f}MB of {total_size_mb:.2f}MB  {tmp_blob_path=}"
                            )
                            chunk_queue.put_nowait(chunk)

                        await chunk_queue.join()
                        writer_task.cancel()

                        num_bytes_downloaded = response.num_bytes_downloaded

                # Need to refine exceptions here
                except Exception as exception:
                    LOGGER.error(f"Failed to download {blob_kind} blob {object_uuid=} {exception=}")
                    return DownloadResult.FAILED

        core_download_time_s = timer.elapsed_s()

        # Has the finished product appeared in the meantime?
        if await self._is_blob_in_cache(blob_item):
            LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, stopping")
            run_in_background_task(_try_delete_temp_file(tmp_blob_path))
            return DownloadResult.ABANDONED

        try:
            LOGGER.debug(f"Rename/move tmp file; {tmp_blob_path=} {local_blob_path=}")
            await aiofiles.os.rename(tmp_blob_path, local_blob_path)
        except Exception as exception:
            LOGGER.error(f"Failed to move temp {blob_kind} blob into cache {object_uuid=} {exception=}")
            run_in_background_task(_try_delete_temp_file(tmp_blob_path))
            return DownloadResult.FAILED

        dl_size_mb = num_bytes_downloaded / (1024 * 1024)
        dl_speed_mbs = dl_size_mb / core_download_time_s
        LOGGER.info(
            f"Downloaded {blob_kind} blob in {timer.elapsed_s():.2f}s  [{dl_speed_mbs:.2f}MB/s, {dl_size_mb:.2f}MB, ImplQueuedWriter, {local_blob_path=}]"
        )

        return DownloadResult.SUCCEEDED

    async def _is_blob_in_cache(self, blob_item: _BlobItem) -> bool:
        local_blob_path = self._make_local_blob_path(blob_item)
        return await _does_file_exist(local_blob_path)

    def _make_local_blob_path(self, blob_item: _BlobItem) -> str:
        local_blob_filename = _make_local_blob_filename(blob_item)
        local_blob_path = os.path.join(self._cache_root_dir, local_blob_filename)
        return local_blob_path


def _make_local_blob_filename(blob_item: _BlobItem) -> str:
    return f"{blob_item.blob_kind}__{blob_item.object_uuid}{blob_item.file_suffix}"


async def _does_file_exist(file_name: str) -> bool:
    return await aiofiles.os.path.isfile(file_name)


async def _try_delete_temp_file(temp_filename: str) -> None:
    try:
        await aiofiles.os.remove(temp_filename)
    except FileNotFoundError:
        pass
