from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException, status
from starlette.requests import Request

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from primary.services.sumo_access.grid_access import GridAccess
from primary.services.user_grid3d_service.user_grid3d_service import UserGrid3dService, IJKIndexFilter

from .schemas import GridSurface

router = APIRouter()

# pylint: disable=unused-argument
# pylint: disable=unused-variable


@router.get("/grid_model_names/")
async def get_grid_model_names(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[str]:
    """
    Get a list of grid model names
    """
    access = await GridAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.grid_model_names()


@router.get("/parameter_names/")
async def get_parameter_names(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
) -> List[str]:
    """
    Get a list of grid parameter names
    """
    access = await GridAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.static_parameter_names(grid_name)


# Primary backend
@router.get("/grid_surface")
async def grid_surface(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    realization: str = Query(description="Realization"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> GridSurface:
    """Get a grid"""

    ijk_index_filter = None
    if grid_name == "Geogrid":
        # 92 146 69
        #ijk_index_filter = IJKIndexFilter(min_i=0, max_i=91, min_j=0, max_j=145, min_k=0, max_k=0)
        ijk_index_filter = IJKIndexFilter(min_i=0, max_i=0, min_j=0, max_j=145, min_k=0, max_k=68)

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    grid_geometry = await grid_service.get_grid_geometry_async(
        ensemble_name=ensemble_name,
        realization=realization,
        grid_name=grid_name,
        ijk_index_filter=ijk_index_filter
    )

    return GridSurface(
        points_b64arr=grid_geometry.vertices_b64arr,
        polys_b64arr=grid_geometry.polys_b64arr,
        xmin=grid_geometry.bounding_box.min_x,
        xmax=grid_geometry.bounding_box.max_x,
        ymin=grid_geometry.bounding_box.min_y,
        ymax=grid_geometry.bounding_box.max_y,
        zmin=grid_geometry.bounding_box.min_z,
        zmax=grid_geometry.bounding_box.max_z,
    )


@router.get("/grid_parameter")
async def grid_parameter(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realization: str = Query(description="Realization"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[float]:
    """Get a grid parameter"""

    ijk_index_filter = None
    if grid_name == "Geogrid":
        ijk_index_filter = IJKIndexFilter(min_i=0, max_i=91, min_j=0, max_j=145, min_k=0, max_k=0)

    grid_service = await UserGrid3dService.create_async(authenticated_user, case_uuid)
    grid_properties = await grid_service.get_mapped_grid_properties_async(
        ensemble_name=ensemble_name,
        realization=realization,
        grid_name=grid_name,
        property_name=parameter_name,
        ijk_index_filter=ijk_index_filter
    )

    return grid_properties.poly_props_arr
