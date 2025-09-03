import logging
from typing import List, Optional

import httpx
import numpy as np
from fmu.sumo.explorer.objects import SearchContext
from pydantic import BaseModel
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary import config
from primary.services.sumo_access.sumo_blob_access import get_sas_token_and_blob_base_uri_for_case_async
from primary.services.sumo_access.sumo_client_factory import create_sumo_client
from primary.services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER

LOGGER = logging.getLogger(__name__)


class RealizationSampleResult(BaseModel):
    realization: int
    sampledValues: list[float]


class _RealizationObjectId(BaseModel):
    realization: int
    objectUuid: str


class _PointSamplingRequestBody(BaseModel):
    sasToken: str
    blobStoreBaseUri: str
    objectIds: List[_RealizationObjectId]
    xCoords: List[float]
    yCoords: List[float]


class _PointSamplingResponseBody(BaseModel):
    sampleResultArr: List[RealizationSampleResult]
    undefLimit: float


# URL of the Go server endpoint
SERVICE_ENDPOINT = f"{config.SURFACE_QUERY_URL}/sample_in_points"


async def batch_sample_surface_in_points_async(
    sumo_access_token: str,
    case_uuid: str,
    ensemble_name: str,
    surface_name: str,
    surface_attribute: str,
    realizations: Optional[List[int]],
    x_coords: list[float],
    y_coords: list[float],
) -> List[RealizationSampleResult]:
    perf_metrics = PerfMetrics()

    realization_object_ids = await _get_object_uuids_for_surface_realizations_async(
        sumo_access_token=sumo_access_token,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        surface_name=surface_name,
        surface_attribute=surface_attribute,
        realizations=realizations,
    )
    perf_metrics.record_lap("obj-uuids")

    sas_token, blob_store_base_uri = await get_sas_token_and_blob_base_uri_for_case_async(sumo_access_token, case_uuid)
    perf_metrics.record_lap("sas-token")

    request_body = _PointSamplingRequestBody(
        sasToken=sas_token,
        blobStoreBaseUri=blob_store_base_uri,
        objectIds=realization_object_ids,
        xCoords=x_coords,
        yCoords=y_coords,
    )

    LOGGER.info(f"Running async go point sampling for surface: {surface_name}")
    response: httpx.Response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.post(
        url=SERVICE_ENDPOINT, json=request_body.model_dump(), timeout=300
    )
    perf_metrics.record_lap("call-go")

    json_data: bytes = response.content
    response_body = _PointSamplingResponseBody.model_validate_json(json_data)

    # Replace values above the undefLimit with np.nan
    for res in response_body.sampleResultArr:
        values_np = np.asarray(res.sampledValues)
        res.sampledValues = np.where((values_np < response_body.undefLimit), values_np, np.nan).tolist()

    perf_metrics.record_lap("parse-response")

    LOGGER.debug(f"batch_sample_surface_in_points_async() took: {perf_metrics.to_string()}")

    return response_body.sampleResultArr


async def _get_object_uuids_for_surface_realizations_async(
    sumo_access_token: str,
    case_uuid: str,
    ensemble_name: str,
    surface_name: str,
    surface_attribute: str,
    realizations: Optional[List[int]],
) -> List[_RealizationObjectId]:
    sumo_client = create_sumo_client(sumo_access_token)

    # What about time here??
    search_context = SearchContext(sumo_client).surfaces.filter(
        uuid=case_uuid,
        ensemble=ensemble_name,
        name=surface_name,
        tagname=surface_attribute,
        realization=realizations if realizations is not None else True,
    )

    ret_list: List[_RealizationObjectId] = []

    # Getting just the object uuids seems easy, but we want them paired with realization numbers
    # object_uuids = await search_context.uuids_async

    # For the time being (as of end Feb 2025), this loop seems to be the fastest way to get the (uuids, rid) pairs using Sumo explorer.
    # Alternatively we could try and formulate a custom search
    async for surf in search_context:
        obj_uuid = surf.uuid
        rid = surf.metadata["fmu"]["realization"]["id"]
        ret_list.append(_RealizationObjectId(realization=rid, objectUuid=obj_uuid))

    return ret_list
