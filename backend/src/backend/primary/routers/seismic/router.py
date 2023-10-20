import logging
import numpy as np
from numpy.typing import NDArray
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Body

from src.services.sumo_access.seismic_access import SeismicAccess, VdsHandle
from src.services.vds_access.vds_access import VdsAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.services.utils.b64 import b64_encode_float_array_as_float32
from src.services.vds_access.response_types import VdsMetadata
from src.services.vds_access.request_types import VdsCoordinateSystem, VdsCoordinates

from . import schemas


LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_directory/")
async def get_seismic_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SeismicCubeMeta]:
    """
    Get a directory of seismic cubes.
    """
    access = await SeismicAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_cube_metas = await access.get_seismic_directory()
    try:
        return [schemas.SeismicCubeMeta(**meta.__dict__) for meta in seismic_cube_metas]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/fence/")
async def get_fence(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_attribute: str = Query(description="Seismic cube attribute"),
    time_or_interval_str: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    polyline: schemas.SeismicFencePolyline = Body(alias="seismicFencePolyline", embed=True),
) -> schemas.SeismicFenceData:
    """Get a fence of seismic data from a polyline defined by a set of (x, y) coordinates in domain coordinate system.

    The fence data contains a set of traces perpendicular to the polyline, with one trace per (x, y)-point in polyline.
    Each trace has number of samples equal length, and is a set of values along the height/depth axis of the fence.

    The returned data
    * fence_traces_b64arr: The fence trace array is base64 encoded 1D float array - where data is stored trace by trace. Decoding info: [num_traces, num_trace_samples]
    * num_traces: Number of traces in fence array
    * num_trace_samples: Number of samples in each trace
    * min_fence_depth: The minimum depth value of the fence.
    * max_fence_depth: The maximum depth value of the fence.

    TODO: Replace time_or_interval_str with time_or_interval: schemas.TimeOrInterval?

    """
    # NOTE: This is a post request as cutting plane must be a body parameter. Should the naming be changed from "get_fence" to "post_fence"?

    seismic_access = await SeismicAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    try:
        vds_handle: VdsHandle = seismic_access.get_vds_handle(
            realization=realization_num,
            seismic_attribute=seismic_attribute,
            time_or_interval_str=time_or_interval_str,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    vds_access = VdsAccess(sas_token=vds_handle.sas_token, vds_url=vds_handle.vds_url)

    # Retrieve fence and post as seismic intersection using cdp coordinates for vds-slice
    # NOTE: Correct coordinate format and scaling - see VdsCoordinateSystem?
    [
        flattened_fence_traces_array,
        num_traces,
        num_trace_samples,
    ] = await vds_access.get_flattened_fence_traces_array_and_metadata(
        coordinates=VdsCoordinates(polyline.x_points, polyline.y_points),
        coordinate_system=VdsCoordinateSystem.CDP,
    )

    meta: VdsMetadata = await vds_access.get_metadata()
    if len(meta.axis) != 3:
        raise ValueError(f"Expected 3 axes, got {len(meta.axis)}")
    depth_axis_meta = meta.axis[2]

    return schemas.SeismicFenceData(
        fence_traces_b64arr=b64_encode_float_array_as_float32(flattened_fence_traces_array),
        num_traces=num_traces,
        num_trace_samples=num_trace_samples,
        min_fence_depth=depth_axis_meta.min,  # TODO: Should this be depth_axis_meta.max?
        max_fence_depth=depth_axis_meta.max,  # TODO: Should this be depth_axis_meta.min?
    )
