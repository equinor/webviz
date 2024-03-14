from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException, status
from starlette.requests import Request

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from primary.services.sumo_access.grid_access import GridAccess
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
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


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
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
