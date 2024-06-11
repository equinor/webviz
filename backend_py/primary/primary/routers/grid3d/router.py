import logging
from typing import Annotated, List, Optional

import numpy as np
from fastapi import APIRouter, Depends, Query, Body

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32, b64_decode_int_array
from webviz_pkg.core_utils.b64 import B64FloatArray, B64IntArray

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from primary.services.user_grid3d_service.user_grid3d_service import (
    UserGrid3dService,
    IJKIndexFilter,
    PolylineIntersection,
)
from primary.services.sumo_access.grid3d_access import Grid3dAccess

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()

# pylint: disable=unused-argument
# pylint: disable=unused-variable


@router.get("/grid_models_info/")
async def get_grid_models_info(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    realization_num: int = Query(description="Realization"),
) -> List[schemas.Grid3dInfo]:
    """
    Get metadata for all 3D grid models, including bbox, dimensions and properties
    """
    perf_metrics = PerfMetrics()
    access = await Grid3dAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    perf_metrics.record_lap("get-grid-access")

    model_infos = await access.get_models_info_arr_async(realization_num)
    perf_metrics.record_lap("get-model-infos")

    ret_model_infos: List[schemas.Grid3dInfo] = []
    for modelinfo in model_infos:
        ret_model_infos.append(schemas.Grid3dInfo.model_validate(modelinfo.model_dump()))
    perf_metrics.record_lap("convert-model-infos")

    LOGGER.debug(f"------------------ GRID3D - model_infos took: {perf_metrics.to_string_s()}")
    return ret_model_infos


@router.get("/is_grid_geometry_shared/")
async def is_grid_geometry_shared(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
) -> bool:
    """
    Check if a 3D grid geometry is shared across realizations
    """
    access = await Grid3dAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    return await access.is_geometry_shared_async(grid_name)


# Primary backend
@router.get("/grid_surface")
# pylint: disable=too-many-arguments
async def grid_surface(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    realization_num: Annotated[int, Query(description="Realization")],
    i_min: Annotated[int, Query(description="Min i index")] = 0,
    i_max: Annotated[int, Query(description="Max i index")] = -1,
    j_min: Annotated[int, Query(description="Min j index")] = 0,
    j_max: Annotated[int, Query(description="Max j index")] = -1,
    k_min: Annotated[int, Query(description="Min k index")] = 0,
    k_max: Annotated[int, Query(description="Max k index")] = -1,
) -> schemas.Grid3dGeometry:
    """Get a grid"""

    perf_metrics = PerfMetrics()

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    perf_metrics.record_lap("create-service")

    ijk_index_filter = IJKIndexFilter(min_i=i_min, max_i=i_max, min_j=j_min, max_j=j_max, min_k=k_min, max_k=k_max)

    grid_geometry = await grid_service.get_grid_geometry_async(
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realization_num,
        ijk_index_filter=ijk_index_filter,
    )
    perf_metrics.record_lap("call-service")

    response = schemas.Grid3dGeometry(
        points_b64arr=grid_geometry.vertices_b64arr,
        polys_b64arr=grid_geometry.polys_b64arr,
        poly_source_cell_indices_b64arr=grid_geometry.poly_source_cell_indices_b64arr,
        origin_utm_x=grid_geometry.origin_utm_x,
        origin_utm_y=grid_geometry.origin_utm_y,
        xmin=grid_geometry.bounding_box.min_x,
        xmax=grid_geometry.bounding_box.max_x,
        ymin=grid_geometry.bounding_box.min_y,
        ymax=grid_geometry.bounding_box.max_y,
        zmin=grid_geometry.bounding_box.min_z,
        zmax=grid_geometry.bounding_box.max_z,
    )

    LOGGER.debug(f"------------------ GRID3D - grid_surface took: {perf_metrics.to_string_s()}")

    return response


@router.get("/grid_parameter")
# pylint: disable=too-many-arguments
async def grid_parameter(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    parameter_name: Annotated[str, Query(description="Grid parameter")],
    realization_num: Annotated[int, Query(description="Realization")],
    parameter_time_or_interval_str: Annotated[
        Optional[str], Query(description="Time point or time interval string")
    ] = None,
    i_min: Annotated[int, Query(description="Min i index")] = 0,
    i_max: Annotated[int, Query(description="Max i index")] = -1,
    j_min: Annotated[int, Query(description="Min j index")] = 0,
    j_max: Annotated[int, Query(description="Max j index")] = -1,
    k_min: Annotated[int, Query(description="Min k index")] = 0,
    k_max: Annotated[int, Query(description="Max k index")] = -1,
) -> schemas.Grid3dMappedProperty:
    """Get a grid parameter"""

    perf_metrics = PerfMetrics()

    ijk_index_filter = IJKIndexFilter(min_i=i_min, max_i=i_max, min_j=j_min, max_j=j_max, min_k=k_min, max_k=k_max)

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    perf_metrics.record_lap("create-service")

    mapped_grid_properties = await grid_service.get_mapped_grid_properties_async(
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        property_name=parameter_name,
        property_time_or_interval_str=parameter_time_or_interval_str,
        realization=realization_num,
        ijk_index_filter=ijk_index_filter,
    )
    perf_metrics.record_lap("call-service")

    # Until the response schema is updated to support int b64 encoded array we force it to float
    float_poly_props_b64arr = _hack_ensure_b64_property_array_is_float(
        mapped_grid_properties.poly_props_b64arr, mapped_grid_properties.undefined_int_value
    )
    response = schemas.Grid3dMappedProperty(
        poly_props_b64arr=float_poly_props_b64arr,
        min_grid_prop_value=mapped_grid_properties.min_grid_prop_value,
        max_grid_prop_value=mapped_grid_properties.max_grid_prop_value,
    )

    LOGGER.debug(f"------------------ GRID3D - grid_parameter took: {perf_metrics.to_string_s()}")

    return response


@router.post("/get_polyline_intersection")
async def post_get_polyline_intersection(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    parameter_name: Annotated[str, Query(description="Grid parameter")],
    realization_num: Annotated[int, Query(description="Realization")],
    parameter_time_or_interval_str: Annotated[
        Optional[str], Query(description="Time point or time interval string")
    ] = None,
    polyline_utm_xy: list[float] = Body(embed=True),
) -> PolylineIntersection:
    perf_metrics = PerfMetrics()

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    perf_metrics.record_lap("create-service")

    polyline_intersection = await grid_service.get_polyline_intersection_async(
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        property_name=parameter_name,
        property_time_or_interval_str=parameter_time_or_interval_str,
        realization=realization_num,
        polyline_utm_xy=polyline_utm_xy,
    )
    perf_metrics.record_lap("call-service")

    LOGGER.debug(f"------------------ GRID3D - get_polyline_intersection took: {perf_metrics.to_string_s()}")

    return polyline_intersection


def _hack_ensure_b64_property_array_is_float(
    props_b64arr: B64FloatArray | B64IntArray, undefined_int_value: int | None
) -> B64FloatArray:
    if isinstance(props_b64arr, B64IntArray):
        LOGGER.debug("Repacking B64 int array to float")
        int_arr_np = b64_decode_int_array(props_b64arr)
        int_arr_np = np.where(int_arr_np == undefined_int_value, -1, int_arr_np)
        float_arr_np = np.asarray(int_arr_np, dtype=np.float32)
        return b64_encode_float_array_as_float32(float_arr_np)

    return props_b64arr
