import asyncio
import logging

from fastapi import HTTPException

from webviz_server_schemas.user_grid3d_ri import api_schemas

from user_grid3d_ri.logic.grid_properties import GridPropertiesExtractor
from user_grid3d_ri.logic.local_blob_cache import LocalBlobCache

LOGGER = logging.getLogger(__name__)


async def make_property_extractor_async(
    blob_cache: LocalBlobCache, property_source: api_schemas.PropertySource
) -> GridPropertiesExtractor:
    """Build the property extractor described by the property source, downloading the blobs it needs"""

    if isinstance(property_source, api_schemas.SinglePropertySource):
        property_path_name = await _download_property_blob_async(blob_cache, property_source.property_blob_object_uuid)
        return await GridPropertiesExtractor.from_roff_property_file_async(property_path_name)

    base_path_name, monitor_path_name = await asyncio.gather(
        _download_property_blob_async(blob_cache, property_source.base_property_blob_object_uuid),
        _download_property_blob_async(blob_cache, property_source.monitor_property_blob_object_uuid),
    )

    base_extractor = await GridPropertiesExtractor.from_roff_property_file_async(base_path_name)
    monitor_extractor = await GridPropertiesExtractor.from_roff_property_file_async(monitor_path_name)

    try:
        return GridPropertiesExtractor.from_difference(monitor_extractor, base_extractor)
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc)) from exc


async def _download_property_blob_async(blob_cache: LocalBlobCache, property_blob_object_uuid: str) -> str:
    property_path_name = await blob_cache.ensure_property_blob_downloaded_async(property_blob_object_uuid)
    if property_path_name is None:
        raise HTTPException(500, detail=f"Failed to download property blob: {property_blob_object_uuid=}")

    LOGGER.debug(f"_download_property_blob_async() - {property_path_name=}")
    return property_path_name
