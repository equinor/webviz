import logging
from typing import Dict, List, Optional

import httpx
import numpy as np
from fmu.sumo.explorer._utils import Utils as InternalExplorerUtils
from fmu.sumo.explorer.objects import CaseCollection
from pydantic import BaseModel
from sumo.wrapper import SumoClient

from primary import config
from primary.services.sumo_access.sumo_blob_access import get_sas_token_and_blob_store_base_uri_for_case

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
    iteration_name: str,
    surface_name: str,
    surface_attribute: str,
    realizations: Optional[List[int]],
    x_coords: list[float],
    y_coords: list[float],
) -> List[RealizationSampleResult]:
    realization_object_ids = await _get_object_uuids_for_surface_realizations(
        sumo_access_token=sumo_access_token,
        case_uuid=case_uuid,
        iteration_name=iteration_name,
        surface_name=surface_name,
        surface_attribute=surface_attribute,
        realizations=realizations,
    )

    sas_token, blob_store_base_uri = get_sas_token_and_blob_store_base_uri_for_case(sumo_access_token, case_uuid)

    request_body = _PointSamplingRequestBody(
        sasToken=sas_token,
        blobStoreBaseUri=blob_store_base_uri,
        objectIds=realization_object_ids,
        xCoords=x_coords,
        yCoords=y_coords,
    )

    async with httpx.AsyncClient(timeout=300) as client:
        LOGGER.info(f"Running async go point sampling for surface: {surface_name}")
        response: httpx.Response = await client.post(url=SERVICE_ENDPOINT, json=request_body.model_dump())

    json_data: bytes = response.content
    response_body = _PointSamplingResponseBody.model_validate_json(json_data)

    # Replace values above the undefLimit with np.nan
    for res in response_body.sampleResultArr:
        values_np = np.asarray(res.sampledValues)
        res.sampledValues = np.where((values_np < response_body.undefLimit), values_np, np.nan).tolist()

    return response_body.sampleResultArr


async def _get_object_uuids_for_surface_realizations(
    sumo_access_token: str,
    case_uuid: str,
    iteration_name: str,
    surface_name: str,
    surface_attribute: str,
    realizations: Optional[List[int]],
) -> List[_RealizationObjectId]:
    sumo_client = SumoClient(env=config.SUMO_ENV, token=sumo_access_token, interactive=False)
    case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
    case = await case_collection.getitem_async(0)

    # What about time here??
    surface_collection = case.surfaces.filter(
        iteration=iteration_name,
        name=surface_name,
        tagname=surface_attribute,
        realization=realizations,
    )

    # Is this the right way to get hold of the object uuids?
    internal_explorer_utils = InternalExplorerUtils(sumo_client)
    # pylint: disable=protected-access
    object_meta_list: List[Dict] = await internal_explorer_utils.get_objects_async(
        500, surface_collection._query, ["_id", "fmu.realization.id"]
    )

    ret_list: List[_RealizationObjectId] = []
    for obj_meta in object_meta_list:
        ret_list.append(
            _RealizationObjectId(
                realization=obj_meta["_source"]["fmu"]["realization"]["id"], objectUuid=obj_meta["_id"]
            )
        )

    return ret_list
