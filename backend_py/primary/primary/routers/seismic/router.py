import logging
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.seismic_access import SeismicAccess, VdsHandle
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.services.vds_access.request_types import VdsCoordinates, VdsCoordinateSystem
from primary.services.vds_access.response_types import VdsMetadata
from primary.services.vds_access.vds_access import VdsAccess
from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_cube_meta_list/")
async def get_seismic_cube_meta_list(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SeismicCubeMeta]:
    """
    Get a list of seismic cube meta.
    """
    access = await SeismicAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    seismic_cube_meta_list = await access.get_seismic_cube_meta_list_async()
    try:
        return [converters.to_api_vds_cube_meta(meta) for meta in seismic_cube_meta_list]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/get_inline_slice/")
async def get_inline_slice(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_attribute: str = Query(description="Seismic cube attribute"),
    time_or_interval_str: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    inline_no: int = Query(description="Inline number"),
) -> schemas.SeismicSliceData:
    """Get a seismic inline from a seismic cube."""
    seismic_access = await SeismicAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    vds_handle: Optional[VdsHandle] = None
    try:
        vds_handle = await seismic_access.get_vds_handle_async(
            realization=realization_num,
            seismic_attribute=seismic_attribute,
            time_or_interval_str=time_or_interval_str,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    if vds_handle is None:
        raise HTTPException(status_code=404, detail="Vds handle not found")

    vds_access = VdsAccess(sas_token=vds_handle.sas_token, vds_url=vds_handle.vds_url)

    flattened_slice_traces_array, metadata = await vds_access.get_inline_slice(line_no=inline_no)

    return converters.to_api_vds_slice_data(
        flattened_slice_traces_array=flattened_slice_traces_array, metadata=metadata
    )


@router.get("/get_crossline_slice/")
async def get_crossline_slice(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_attribute: str = Query(description="Seismic cube attribute"),
    time_or_interval_str: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    crossline_no: int = Query(description="Crossline number"),
) -> schemas.SeismicSliceData:
    """Get a seismic crossline from a seismic cube."""
    seismic_access = await SeismicAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    vds_handle: Optional[VdsHandle] = None
    try:
        vds_handle = await seismic_access.get_vds_handle_async(
            realization=realization_num,
            seismic_attribute=seismic_attribute,
            time_or_interval_str=time_or_interval_str,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    if vds_handle is None:
        raise HTTPException(status_code=404, detail="Vds handle not found")

    vds_access = VdsAccess(sas_token=vds_handle.sas_token, vds_url=vds_handle.vds_url)

    flattened_slice_traces_array, metadata = await vds_access.get_crossline_slice(line_no=crossline_no)

    return converters.to_api_vds_slice_data(
        flattened_slice_traces_array=flattened_slice_traces_array, metadata=metadata
    )


@router.get("/get_depth_slice/")
async def get_depth_slice(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_attribute: str = Query(description="Seismic cube attribute"),
    time_or_interval_str: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    depth_slice_no: int = Query(description="Depth slice no"),
) -> schemas.SeismicSliceData:
    """Get a seismic depth slice from a seismic cube."""
    seismic_access = await SeismicAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    vds_handle: Optional[VdsHandle] = None
    try:
        vds_handle = await seismic_access.get_vds_handle_async(
            realization=realization_num,
            seismic_attribute=seismic_attribute,
            time_or_interval_str=time_or_interval_str,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    if vds_handle is None:
        raise HTTPException(status_code=404, detail="Vds handle not found")

    vds_access = VdsAccess(sas_token=vds_handle.sas_token, vds_url=vds_handle.vds_url)

    flattened_slice_traces_array, metadata = await vds_access.get_depth_slice(depth_slice_no=depth_slice_no)

    return converters.to_api_vds_slice_data(
        flattened_slice_traces_array=flattened_slice_traces_array, metadata=metadata
    )


@router.post("/get_seismic_fence/")
async def post_get_seismic_fence(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_attribute: str = Query(description="Seismic cube attribute"),
    time_or_interval_str: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    polyline: schemas.SeismicFencePolyline = Body(embed=True),
) -> schemas.SeismicFenceData:
    """Get a fence of seismic data from a polyline defined by a set of (x, y) coordinates in domain coordinate system.

    The fence data contains a set of traces perpendicular to the polyline, with one trace per (x, y)-point in polyline.
    Each trace has equal number of samples, and is a set of sample values along the depth direction of the seismic cube.

    Returns:
    A SeismicFenceData object with fence traces in encoded 1D array, metadata for trace array decoding and fence min/max depth.
    """
    seismic_access = await SeismicAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    vds_handle: Optional[VdsHandle] = None
    try:
        vds_handle = await seismic_access.get_vds_handle_async(
            realization=realization_num,
            seismic_attribute=seismic_attribute,
            time_or_interval_str=time_or_interval_str,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    if vds_handle is None:
        raise HTTPException(status_code=404, detail="Vds handle not found")

    vds_access = VdsAccess(sas_token=vds_handle.sas_token, vds_url=vds_handle.vds_url)

    # Retrieve fence and post as seismic intersection using cdp coordinates for vds-slice
    # NOTE: Correct coordinate format and scaling - see VdsCoordinateSystem?
    [
        flattened_fence_traces_array,
        num_traces,
        num_samples_per_trace,
    ] = await vds_access.get_flattened_fence_traces_array_and_metadata_async(
        coordinates=VdsCoordinates(polyline.x_points, polyline.y_points),
        coordinate_system=VdsCoordinateSystem.CDP,
    )
    meta: VdsMetadata = await vds_access.get_metadata_async()

    if len(meta.axis) != 3:
        raise ValueError(f"Expected 3 axes, got {len(meta.axis)}")
    depth_axis_meta = meta.axis[2]

    return schemas.SeismicFenceData(
        fence_traces_b64arr=b64_encode_float_array_as_float32(flattened_fence_traces_array),
        num_traces=num_traces,
        num_samples_per_trace=num_samples_per_trace,
        min_fence_depth=depth_axis_meta.min,
        max_fence_depth=depth_axis_meta.max,
    )
