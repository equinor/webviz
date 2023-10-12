from typing import List

from fastapi import APIRouter, Depends, Query
from starlette.requests import Request

from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.backend.primary.user_session_proxy import proxy_to_user_session

from src.services.sumo_access.grid_access import GridAccess
from .schemas import GridSurface, GridIntersection

router = APIRouter()


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

    response = await proxy_to_user_session(updated_request, authenticated_user)
    return response


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

    response = await proxy_to_user_session(updated_request, authenticated_user)
    return response


@router.get("/grid_parameter_intersection")
async def grid_parameter_intersection(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realization: str = Query(description="Realization"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> GridIntersection:
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

    response = await proxy_to_user_session(updated_request, authenticated_user)
    return response


@router.get("/statistical_grid_parameter_intersection")
async def statistical_grid_parameter_intersection(
    request: Request,
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realizations: List[str] = Query(description="Realizations"),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> GridIntersection:
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

    response = await proxy_to_user_session(updated_request, authenticated_user)
    return response


@router.get("/statistical_grid_parameter")
async def statistical_grid_parameter(
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

    response = await proxy_to_user_session(updated_request, authenticated_user)
    return response
