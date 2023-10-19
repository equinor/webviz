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
    * fence_traces_encoded: array of traces is a base64 encoded flattened float32 array of trace values. Decoding info: [num_traces, num_trace_samples]
    * num_traces: Number of traces in fence
    * num_trace_samples: Number of samples in each trace
    * min_height: Minimum height/depth value of fence
    * max_height: Maximum height/depth value of fence
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
    fence_traces_ndarray_float32 = await vds_access.get_fence_traces_as_ndarray(
        coordinates=VdsCoordinates(polyline.x_points, polyline.y_points),
        coordinate_system=VdsCoordinateSystem.CDP,
    )
    if len(fence_traces_ndarray_float32.shape) != 2:
        raise ValueError(f"Expected fence traces array of 2 dimensions, got {len(fence_traces_ndarray_float32.shape)}")

    meta: VdsMetadata = await vds_access.get_metadata()
    if len(meta.axis) != 3:
        raise ValueError(f"Expected 3 axes, got {len(meta.axis)}")
    depth_axis_meta = meta.axis[2]

    return schemas.SeismicFenceData(
        fence_traces_encoded=b64_encode_float_array_as_float32(fence_traces_ndarray_float32),
        num_traces=fence_traces_ndarray_float32.shape[0],
        num_trace_samples=fence_traces_ndarray_float32.shape[1],
        min_height=depth_axis_meta.min,  # TODO: Should this be depth_axis_meta.max?
        max_height=depth_axis_meta.max,  # TODO: Should this be depth_axis_meta.min?
    )
