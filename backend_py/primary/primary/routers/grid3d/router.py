from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException, status
from starlette.requests import Request

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.grid3d_access import Grid3dAccess

from . import schemas

router = APIRouter()

# pylint: disable=unused-argument
# pylint: disable=unused-variable


@router.get("/grid_models_info/")
async def get_grid_models_info(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization"),
) -> List[schemas.Grid3dInfo]:
    """
    Get metadata for all 3D grid models, including bbox, dimensions and properties
    """
    access = await Grid3dAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.get_models_info_arr_async(realization)



@router.get("/is_grid_geometry_shared/")
async def is_grid_geometry_shared(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid3d_geometry_name: str = Query(description="3D grid geometry name"),
) -> bool:
    """
    Check if a 3D grid geometry is shared across realizations
    """
    access = await Grid3dAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.is_geometry_shared_async(grid3d_geometry_name)


@router.get("/grid_surface_geometry/")
async def get_grid_surface_geometry(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid3d_geometry_name: str = Query(description="3D grid geometry name"),
    realization: int = Query(description="Realization"),
    # ijk_filter
) -> schemas.GridSurface:

    """
    Get the geometry of the 3D grid surface/skin
    """
    access = await Grid3dAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    grid_geometry_uuid = await access.get_geometry_blob_id_async(grid3d_geometry_name, realization)
    print(f"Grid geometry uuid: {grid_geometry_uuid}")

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/grid_surface_property_values/")
async def get_grid_surface_property_values(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid3d_geometry_name: str = Query(description="3D grid geometry name"),
    grid3d_property_name: str = Query(description="3D grid property name"),
    realization: int = Query(description="Realization"),
    # ijk_filter
) -> List[float]:

    """
    Get property values for a 3D grid surface/skin
    """
    access = await Grid3dAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    grid_geometry_uuid = await access.get_geometry_blob_id_async(grid3d_geometry_name, realization)
    grid_property_uuid = await access.get_property_uuid_async(grid3d_geometry_name, grid3d_property_name, realization)
    print(f"Grid geometry uuid: {grid_geometry_uuid}")
    print(f"Grid property uuid: {grid_property_uuid}")

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
