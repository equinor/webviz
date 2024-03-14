from typing import List

from fastapi import APIRouter, Depends, Query, HTTPException, status
from starlette.requests import Request

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from .schemas_vtk import GridSurfaceVtk, GridIntersectionVtk

router = APIRouter()

# pylint: disable=unused-argument
# pylint: disable=unused-variable


# Primary backend
@router.get("/grid_surface_vtk")
async def grid_surface_vtk(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    realization: str = Query(description="Realization"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> GridSurfaceVtk:
    """Get a grid"""

    query_params = {
        "case_uuid": case_uuid,
        "ensemble_name": ensemble_name,
        "grid_name": grid_name,
        "realization": int(realization),
    }

    # Add query parameters to the request URL
    updated_request = Request(
        scope={
            "type": "http",
            "method": request.method,
            "path": request.url.path,
            "query_string": request.url.include_query_params(**query_params).query.encode("utf-8"),
            "headers": request.headers.raw,
        },
        receive=request._receive,  # pylint: disable=protected-access
    )

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/grid_parameter_vtk")
async def grid_parameter_vtk(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realization: str = Query(description="Realization"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[float]:
    """Get a grid parameter"""

    query_params = {
        "case_uuid": case_uuid,
        "ensemble_name": ensemble_name,
        "grid_name": grid_name,
        "parameter_name": parameter_name,
        "realization": int(realization),
    }

    # Add query parameters to the request URL
    updated_request = Request(
        scope={
            "type": "http",
            "method": request.method,
            "path": request.url.path,
            "query_string": request.url.include_query_params(**query_params).query.encode("utf-8"),
            "headers": request.headers.raw,
        },
        receive=request._receive,  # pylint: disable=protected-access
    )

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/grid_parameter_intersection_vtk")
async def grid_parameter_intersection_vtk(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realization: str = Query(description="Realization"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> GridIntersectionVtk:
    """Get a grid parameter"""

    query_params = {
        "case_uuid": case_uuid,
        "ensemble_name": ensemble_name,
        "grid_name": grid_name,
        "parameter_name": parameter_name,
        "realization": int(realization),
    }

    # Add query parameters to the request URL
    updated_request = Request(
        scope={
            "type": "http",
            "method": request.method,
            "path": request.url.path,
            "query_string": request.url.include_query_params(**query_params).query.encode("utf-8"),
            "headers": request.headers.raw,
        },
        receive=request._receive,  # pylint: disable=protected-access
    )

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/statistical_grid_parameter_intersection_vtk")
async def statistical_grid_parameter_intersection_vtk(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realizations: List[str] = Query(description="Realizations"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> GridIntersectionVtk:
    """Get a grid parameter"""

    query_params = {
        "case_uuid": case_uuid,
        "ensemble_name": ensemble_name,
        "grid_name": grid_name,
        "parameter_name": parameter_name,
        "realizations": [int(realization) for realization in realizations],
    }

    # Add query parameters to the request URL
    updated_request = Request(
        scope={
            "type": "http",
            "method": request.method,
            "path": request.url.path,
            "query_string": request.url.include_query_params(**query_params).query.encode("utf-8"),
            "headers": request.headers.raw,
        },
        receive=request._receive,  # pylint: disable=protected-access
    )

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/statistical_grid_parameter_vtk")
async def statistical_grid_parameter_vtk(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realizations: List[str] = Query(description="Realizations"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[float]:
    """Get a grid parameter"""

    query_params = {
        "case_uuid": case_uuid,
        "ensemble_name": ensemble_name,
        "grid_name": grid_name,
        "parameter_name": parameter_name,
        "realizations": [int(realization) for realization in realizations],
    }
    # Add query parameters to the request URL
    updated_request = Request(
        scope={
            "type": "http",
            "method": request.method,
            "path": request.url.path,
            "query_string": request.url.include_query_params(**query_params).query.encode("utf-8"),
            "headers": request.headers.raw,
        },
        receive=request._receive,  # pylint: disable=protected-access
    )

    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
