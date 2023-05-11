from typing import Dict, Union, NamedTuple

import numpy as np
import orjson
import xtgeo
from fastapi import APIRouter, Depends, Response, Request
from functools import lru_cache
from src.backend.auth.auth_helper import AuthHelper, AuthenticatedUser
from src.services.sumo_access.grid_access import GridAccess
from src.backend.primary.routers.grid.schemas import GridGeometry, B64EncodedNumpyArray
from src.services.utils.vtk_utils import get_surface, get_scalar_values, VtkGridSurface
from src.services.utils.b64 import b64_encode_numpy
from vtkmodules.util.numpy_support import (
    vtk_to_numpy,
)

router = APIRouter()


@router.get(
    "/grid_geometry", response_model=GridGeometry
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
async def grid(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    realization = request.query_params.get("realization")

    print("Sending data to primary", flush=True)
    grid_geometry = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realization,
    )
    grid_geometrics = grid_geometry.get_geometrics(allcells=True, return_dict=True)
    grid_polydata = get_grid_polydata(grid_geometry=grid_geometry)

    points_np = vtk_to_numpy(grid_polydata.polydata.GetPoints().GetData()).ravel().astype(np.float32)
    polys_np = vtk_to_numpy(grid_polydata.polydata.GetPolys().GetData()).astype(np.int64)
    points_np = np.around(points_np, decimals=2)
    # grid_geometry = GridGeometry(points=points_np.tolist(), polys=polys_np.tolist(), **grid_geometrics)

    grid_geometry = GridGeometry(
        points=b64_encode_numpy(points_np),
        polys=b64_encode_numpy(polys_np),
        **grid_geometrics,
    )
    return Response(orjson.dumps(grid_geometry.__dict__), media_type="application/json")


@router.get(
    "/grid_parameter", response_model=GridGeometry
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
async def grid_parameter(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    parameter_name = request.query_params.get("parameter_name")
    realization = request.query_params.get("realization")

    print("Sending data to primary", flush=True)
    grid_geometry = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realization,
    )
    grid_polydata = get_grid_polydata(grid_geometry=grid_geometry)

    xtgeo_parameter = get_grid_parameter(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        parameter_name=parameter_name,
        realization=realization,
    )

    # using orjson instead of slow FastAPI default encoder (json.dumps)
    scalar_values = get_scalar_values(xtgeo_parameter, cell_ids=grid_polydata.original_cell_ids)
    scalar_values[scalar_values == -999.0] = np.nan
    encoded_values = B64EncodedNumpyArray(**b64_encode_numpy(scalar_values))
    # return Response(orjson.dumps(encoded_values.__dict__), media_type="application/json")
    return Response(orjson.dumps(scalar_values.tolist()), media_type="application/json")


@router.get(
    "/statistical_grid_parameter", response_model=GridGeometry
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
async def statistical_grid_parameter(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    parameter_name = request.query_params.get("parameter_name")
    realizations = orjson.loads(request.query_params.get("realizations"))

    print("REALIZATIONS", realizations, flush=True)
    grid_access = GridAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    if not grid_access.grids_have_equal_nxnynz(grid_name=grid_name):
        raise ValueError("Grids must have equal nx, ny, nz")

    grid_geometry = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realizations[0],
    )
    grid_polydata = get_grid_polydata(grid_geometry=grid_geometry)

    xtgeo_parameters = [
        get_grid_parameter(
            authenticated_user=authenticated_user,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            grid_name=grid_name,
            parameter_name=parameter_name,
            realization=real,
        )
        for real in realizations
    ]
    print("XTGEO PARAMETERS", xtgeo_parameters, flush=True)

    all_scalar_values = [
        get_scalar_values(xtgeo_parameter, cell_ids=grid_polydata.original_cell_ids)
        for xtgeo_parameter in xtgeo_parameters
    ]
    print(np.nanmin(all_scalar_values), np.nanmax(all_scalar_values), flush=True)
    mean_scalar_values = np.nanmean([scalar_values for scalar_values in all_scalar_values], axis=0)
    mean_scalar_values[mean_scalar_values == -999.0] = np.nan

    # using orjson instead of slow FastAPI default encoder (json.dumps)
    encoded_values = B64EncodedNumpyArray(**b64_encode_numpy(mean_scalar_values))

    # return Response(orjson.dumps(encoded_values.__dict__), media_type="application/json")
    return Response(orjson.dumps(mean_scalar_values.tolist()), media_type="application/json")


@lru_cache
def get_grid_geometry(authenticated_user, case_uuid, ensemble_name, grid_name, realization):
    token = authenticated_user.get_sumo_access_token()
    grid_access = GridAccess(token, case_uuid, ensemble_name)
    print("REALIZATION FOR GEOMETRY", realization, flush=True)
    grid_geometry = grid_access.get_grid_geometry(grid_name, int(realization))

    return grid_geometry


@lru_cache
def get_grid_polydata(grid_geometry) -> VtkGridSurface:
    grid_polydata = get_surface(grid_geometry)

    return grid_polydata


@lru_cache
def get_grid_parameter(authenticated_user, case_uuid, ensemble_name, grid_name, parameter_name, realization):
    token = authenticated_user.get_sumo_access_token()
    grid_access = GridAccess(token, case_uuid, ensemble_name)
    print("Downloading", case_uuid, ensemble_name, grid_name, parameter_name, realization, flush=True)
    grid_parameter = grid_access.get_grid_parameter(grid_name, parameter_name, int(realization))

    return grid_parameter
