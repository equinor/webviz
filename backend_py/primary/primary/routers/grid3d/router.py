import logging
from typing import List
from typing import Annotated

from fastapi import APIRouter, Depends, Query, HTTPException, status, Body
from starlette.requests import Request

from webviz_pkg.core_utils.perf_timer import PerfTimer
from webviz_pkg.core_utils.b64 import b64_decode_float_array_to_list

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
    realization: int = Query(description="Realization"),
) -> List[schemas.Grid3dInfo]:
    """
    Get metadata for all 3D grid models, including bbox, dimensions and properties
    """
    access = await Grid3dAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.get_models_info_arr_async(realization)


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
    access = await Grid3dAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.is_geometry_shared_async(grid_name)


# Primary backend
@router.get("/grid_surface")
async def grid_surface(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    realization: Annotated[str, Query(description="Realization")],
    single_k_layer: Annotated[int, Query(description="Show only a single k layer")] = -1,
) -> schemas.Grid3dGeometry:
    """Get a grid"""

    timer = PerfTimer()

    ijk_index_filter = None
    if single_k_layer >= 0:
        ijk_index_filter = IJKIndexFilter(
            min_i=-1, max_i=-1, min_j=-1, max_j=-1, min_k=single_k_layer, max_k=single_k_layer
        )

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    grid_geometry = await grid_service.get_grid_geometry_async(
        ensemble_name=ensemble_name, realization=realization, grid_name=grid_name, ijk_index_filter=ijk_index_filter
    )

    response = schemas.GridSurface(
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

    LOGGER.debug(f"------------------ GRID3D - grid_surface took: {timer.elapsed_s():.2f}s")

    return response


@router.get("/grid_parameter")
async def grid_parameter(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    parameter_name: Annotated[str, Query(description="Grid parameter")],
    realization: Annotated[str, Query(description="Realization")],
    single_k_layer: Annotated[int, Query(description="Show only a single k layer")] = -1,
) -> schemas.Grid3dMappedProperty:
    """Get a grid parameter"""

    timer = PerfTimer()

    ijk_index_filter = None
    if single_k_layer >= 0:
        ijk_index_filter = IJKIndexFilter(
            min_i=-1, max_i=-1, min_j=-1, max_j=-1, min_k=single_k_layer, max_k=single_k_layer
        )

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    mapped_grid_properties = await grid_service.get_mapped_grid_properties_async(
        ensemble_name=ensemble_name,
        realization=realization,
        grid_name=grid_name,
        property_name=parameter_name,
        ijk_index_filter=ijk_index_filter,
    )

    # Until the response schema is updated to use the b64 encoded array, we need to decode it here
    response = schemas.Grid3dMappedProperty(
        poly_props_arr=b64_decode_float_array_to_list(mapped_grid_properties.poly_props_b64arr)
    )

    LOGGER.debug(f"------------------ GRID3D - grid_parameter took: {timer.elapsed_s():.2f}s")

    return response


@router.post("/get_polyline_intersection")
async def post_get_polyline_intersection(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    parameter_name: Annotated[str, Query(description="Grid parameter")],
    realization: Annotated[str, Query(description="Realization")],
    polyline_utm_xy: list[float] = Body(embed=True),
) -> PolylineIntersection:
    timer = PerfTimer()

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    polyline_intersection = await grid_service.get_polyline_intersection_async(
        ensemble_name=ensemble_name,
        realization=realization,
        grid_name=grid_name,
        property_name=parameter_name,
        polyline_utm_xy=polyline_utm_xy,
    )

    LOGGER.debug(f"------------------ GRID3D - get_polyline_intersection took: {timer.elapsed_s():.2f}s")

    return polyline_intersection
