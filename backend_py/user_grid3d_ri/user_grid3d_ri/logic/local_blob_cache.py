import logging
import os

import aiofiles
import aiofiles.os
import httpx

from webviz_pkg.core_utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)


_CACHE_ROOOT_DIR = "/home/appuser/blob_cache"


class LocalBlobCache:
    def __init__(self, sas_token: str, blob_store_base_uri: str) -> None:
        self._sas_token = sas_token
        self._blob_store_base_uri = blob_store_base_uri
        self._root_dir = _CACHE_ROOOT_DIR
        os.makedirs(self._root_dir, exist_ok=True)

    async def ensure_grid_blob_downloaded_async(self, object_uuid: str) -> str | None:
        return await self._ensure_blob_downloaded(object_uuid, "GRID", ".roff")

    async def ensure_property_blob_downloaded_async(self, object_uuid: str) -> str | None:
        return await self._ensure_blob_downloaded(object_uuid, "PROPERTY", ".roff")

    async def _ensure_blob_downloaded(self, object_uuid: str, blob_kind: str, file_suffix: str) -> str | None:
        local_blob_filename = f"{blob_kind}__{object_uuid}{file_suffix}"
        local_blob_path = os.path.join(self._root_dir, local_blob_filename)
        if _does_file_exist(local_blob_path):
            LOGGER.debug(f"Found {blob_kind} blob in cache, returning immediately: {local_blob_path}")
            return local_blob_path

        timer = PerfTimer()
        num_bytes_downloaded = 0
        num_bytes_written = 0
        url = f"{self._blob_store_base_uri}/{object_uuid}?{self._sas_token}"

        async with aiofiles.tempfile.NamedTemporaryFile(prefix=f"{local_blob_filename}__", delete=False) as tmp_file:
            tmp_blob_path = tmp_file.name
            LOGGER.debug(f"Downloading {blob_kind} blob into temp file: {tmp_blob_path}")
            async with httpx.AsyncClient() as client:
                try:
                    async with client.stream("GET", url=url) as response:
                        response.raise_for_status()
                        # What should we do about chunk size here?
                        # Leave it to the content or force a higher value?
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                            await tmp_file.write(chunk)
                            num_bytes_written += len(chunk)
                            LOGGER.debug(
                                f"  - downloading {blob_kind}  {tmp_blob_path=}  {num_bytes_written=}  {len(chunk)=}"
                            )

                            if _does_file_exist(local_blob_path):
                                LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, returning: {local_blob_path=}")
                                return local_blob_path

                        num_bytes_downloaded = response.num_bytes_downloaded

                # Need to refine exceptions here
                except Exception as exception:
                    LOGGER.error(f"Failed to download {blob_kind} blob {object_uuid=} {exception=}")

                    if _does_file_exist(local_blob_path):
                        LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, returning: {local_blob_path=}")
                        return local_blob_path
                    return None

        # Has the finished product appeared in the meantime?
        if _does_file_exist(local_blob_path):
            LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, returning: {local_blob_path=}")
            return local_blob_path

        try:
            LOGGER.debug(f"Rename/move tmp file; {tmp_blob_path=} {local_blob_path=}")
            await aiofiles.os.rename(tmp_blob_path, local_blob_path)
        except Exception as exception:
            if _does_file_exist(local_blob_path):
                LOGGER.debug(f"Failed to move temp {blob_kind} blob into cache {object_uuid=} {exception=}")
                LOGGER.debug(f"SUDDENLY found {blob_kind} blob in cache, returning: {local_blob_path=}")
                return local_blob_path

            LOGGER.error(f"Failed to move temp {blob_kind} blob into cache {object_uuid=} {exception=}")

            try:
                await aiofiles.os.remove(tmp_blob_path)
            except FileNotFoundError:
                pass
            return None

        size_mb = num_bytes_downloaded / (1024 * 1024)
        LOGGER.info(f"Downloaded {blob_kind} blob in {timer.elapsed_s():.2f}s  [{size_mb=:.2f}, {local_blob_path=}]")

        return local_blob_path


def _does_file_exist(file_name: str) -> bool:
    return os.path.isfile(file_name)
