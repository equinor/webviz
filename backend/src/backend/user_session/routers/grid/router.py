from functools import lru_cache
from typing import List, Tuple

import numpy as np
import orjson
import xtgeo
from fastapi import APIRouter, Depends, Request, Response
from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper
from src.backend.primary.routers.grid.schemas import (
    B64EncodedNumpyArray,
    GridGeometry,
    GridIntersection,
)
from src.services.sumo_access.grid_access import GridAccess
from src.services.utils.b64 import b64_encode_numpy
from src.services.utils.vtk_utils import (
    VtkGridSurface,
    get_scalar_values,
    get_surface,
    cut_along_polyline,
    flatten_sliced_grid,
    xtgeo_grid_to_vtk_explicit_structured_grid,
    create_planes,
    create_polyline,
    grid_to_numpy,
    get_triangles,
)
from src.services.utils.mpl_utils import visualize_with_scalars
from vtkmodules.util.numpy_support import vtk_to_numpy

router = APIRouter()


@router.get(
    "/grid_geometry", response_model=GridGeometry
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
# type: ignore
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

    points_np = (
        vtk_to_numpy(grid_polydata.polydata.GetPoints().GetData())
        .ravel()
        .astype(np.float32)
    )
    polys_np = vtk_to_numpy(grid_polydata.polydata.GetPolys().GetData()).astype(
        np.int64
    )
    points_np = np.around(points_np, decimals=2)
    # grid_geometry = GridGeometry(points=points_np.tolist(), polys=polys_np.tolist(), **grid_geometrics)

    grid_geometry = GridGeometry(
        points=b64_encode_numpy(points_np),
        polys=b64_encode_numpy(polys_np),
        **grid_geometrics,
    )
    return Response(orjson.dumps(grid_geometry.__dict__), media_type="application/json")


@router.get(
    "/grid_parameter", response_model=List[float]
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
# type: ignore
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
    scalar_values = get_scalar_values(
        xtgeo_parameter, cell_ids=grid_polydata.original_cell_ids
    )
    scalar_values[scalar_values == -999.0] = np.nan
    encoded_values = B64EncodedNumpyArray(**b64_encode_numpy(scalar_values))
    # return Response(orjson.dumps(encoded_values.__dict__), media_type="application/json")
    return Response(orjson.dumps(scalar_values.tolist()), media_type="application/json")


@router.get(
    "/grid_parameter_intersection", response_model=List[float]
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
# type: ignore
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
    # grid_polydata = get_grid_polydata(grid_geometry=grid_geometry)

    xtgeo_parameter = get_grid_parameter(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        parameter_name=parameter_name,
        realization=realization,
    )

    xyz_arr = tuple(
        tuple(point)
        for point in [
            [457072.081, 5935578.079, 0],
            [457977.354, 5935308.085, -1725.116],
            [458739.689, 5935053.973, -1717.389],
            [463109.377, 5931933.392, -1665.353],
            [466204.051, 5931049.199, -1709.354],
        ]
    )

    coords, triangles, original_cell_indices_np, polyline = generate_grid_intersection(
        grid_geometry, xyz_arr
    )
    values = get_scalar_values(xtgeo_parameter, cell_ids=original_cell_indices_np)

    print(np.nanmin(values), np.nanmax(values), flush=True)
    print(np.min(values), np.max(values), flush=True)
    values[values < np.nanmin(values)] = np.nanmin(values)
    values[values > np.nanmax(values)] = np.nanmax(values)
    # values[values > 0.4] = 0.4
    # values = values[original_cell_indices_np]
    # scalar_values[scalar_values == -999.0] = 0
    polyline_coords = np.array(
        [polyline.GetPoint(i)[:3] for i in range(polyline.GetNumberOfPoints())]
    )

    # Calculate the cumulative distance along the polyline
    polyline_distances = np.zeros(polyline_coords.shape[0])
    for i in range(1, polyline_coords.shape[0]):
        polyline_distances[i] = polyline_distances[i - 1] + np.linalg.norm(
            polyline_coords[i, :2] - polyline_coords[i - 1, :2]
        )

    polyline_x = polyline_distances
    polyline_y = polyline_coords[:, 2]
    image_data = visualize_with_scalars(coords, triangles, values, polyline)
    y = coords[:, 1]
    x_min, x_max = np.min(coords[:, 0]), np.max(coords[:, 0])
    y_min, y_max = np.min(y), np.max(y)
    # Get the polyline coordinates

    intersection_data = GridIntersection(
        image="data:image/png;base64,{}".format(image_data),
        polyline_x=polyline_x.tolist(),
        polyline_y=polyline_y.tolist(),
        x_min=float(x_min),
        x_max=float(x_max),
        y_min=float(y_min),
        y_max=float(y_max),
    )
    return Response(
        orjson.dumps(intersection_data.__dict__),
        media_type="application/json",
    )


@router.get(
    "/statistical_grid_parameter_intersection", response_model=List[float]
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
# type: ignore
async def grid_parameter(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    parameter_name = request.query_params.get("parameter_name")

    realizations = orjson.loads(request.query_params.get("realizations"))
    print("Sending data to primary", flush=True)
    grid_access = GridAccess(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    # type: ignore
    if not grid_access.grids_have_equal_nxnynz(grid_name=grid_name):
        raise ValueError("Grids must have equal nx, ny, nz")

    grid_geometry = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realizations[0],
    )

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


    xyz_arr = tuple(
        tuple(point)
        for point in [
            [457072.081, 5935578.079, 0],
            [457977.354, 5935308.085, -1725.116],
            [458739.689, 5935053.973, -1717.389],
            [463109.377, 5931933.392, -1665.353],
            [466204.051, 5931049.199, -1709.354],
        ]
    )

    coords, triangles, original_cell_indices_np, polyline = generate_grid_intersection(
        grid_geometry, xyz_arr
    )
    all_scalar_values = [
        get_scalar_values(xtgeo_parameter, cell_ids=original_cell_indices_np)
        for xtgeo_parameter in xtgeo_parameters
    ]
    print(np.nanmin(all_scalar_values), np.nanmax(all_scalar_values), flush=True)
    values = np.nanmean(
        [scalar_values for scalar_values in all_scalar_values], axis=0
    )

    print(np.nanmin(values), np.nanmax(values), flush=True)
    print(np.min(values), np.max(values), flush=True)
    values[values < np.nanmin(values)] = np.nanmin(values)
    values[values > np.nanmax(values)] = np.nanmax(values)
    # values[values > 0.4] = 0.4
    # values = values[original_cell_indices_np]
    values[values == -999.0] = np.nan
    polyline_coords = np.array(
        [polyline.GetPoint(i)[:3] for i in range(polyline.GetNumberOfPoints())]
    )

    # Calculate the cumulative distance along the polyline
    polyline_distances = np.zeros(polyline_coords.shape[0])
    for i in range(1, polyline_coords.shape[0]):
        polyline_distances[i] = polyline_distances[i - 1] + np.linalg.norm(
            polyline_coords[i, :2] - polyline_coords[i - 1, :2]
        )

    polyline_x = polyline_distances
    polyline_y = polyline_coords[:, 2]
    image_data = visualize_with_scalars(coords, triangles, values, polyline)
    y = coords[:, 1]
    x_min, x_max = np.min(coords[:, 0]), np.max(coords[:, 0])
    y_min, y_max = np.min(y), np.max(y)
    # Get the polyline coordinates

    intersection_data = GridIntersection(
        image="data:image/png;base64,{}".format(image_data),
        polyline_x=polyline_x.tolist(),
        polyline_y=polyline_y.tolist(),
        x_min=float(x_min),
        x_max=float(x_max),
        y_min=float(y_min),
        y_max=float(y_max),
    )
    return Response(
        orjson.dumps(intersection_data.__dict__),
        media_type="application/json",
    )


@router.get(
    "/statistical_grid_parameter", response_model=List[float]
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
# type: ignore
async def statistical_grid_parameter(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    parameter_name = request.query_params.get("parameter_name")
    # type: ignore
    realizations = orjson.loads(request.query_params.get("realizations"))

    print("REALIZATIONS", realizations, flush=True)
    # type: ignore
    grid_access = GridAccess(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    # type: ignore
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
    mean_scalar_values = np.nanmean(
        [scalar_values for scalar_values in all_scalar_values], axis=0
    )
    mean_scalar_values[mean_scalar_values == -999.0] = np.nan

    # using orjson instead of slow FastAPI default encoder (json.dumps)
    encoded_values = B64EncodedNumpyArray(**b64_encode_numpy(mean_scalar_values))

    # return Response(orjson.dumps(encoded_values.__dict__), media_type="application/json")
    return Response(
        orjson.dumps(mean_scalar_values.tolist()), media_type="application/json"
    )


@lru_cache
def get_grid_geometry(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
    grid_name: str,
    realization: int,
) -> xtgeo.Grid:
    token = authenticated_user.get_sumo_access_token()
    grid_access = GridAccess(token, case_uuid, ensemble_name)
    print("REALIZATION FOR GEOMETRY", realization, flush=True)
    grid_geometry = grid_access.get_grid_geometry(grid_name, int(realization))

    return grid_geometry


@lru_cache
def get_grid_polydata(grid_geometry: xtgeo.Grid) -> VtkGridSurface:
    grid_polydata = get_surface(grid_geometry)

    return grid_polydata


@lru_cache
def get_grid_parameter(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
    grid_name: str,
    parameter_name: str,
    realization: int,
) -> xtgeo.GridProperty:
    token = authenticated_user.get_sumo_access_token()
    grid_access = GridAccess(token, case_uuid, ensemble_name)
    print(
        "Downloading",
        case_uuid,
        ensemble_name,
        grid_name,
        parameter_name,
        realization,
        flush=True,
    )
    grid_parameter = grid_access.get_grid_parameter(
        grid_name, parameter_name, int(realization)
    )

    return grid_parameter


@lru_cache
def generate_grid_intersection(grid_geometry: xtgeo.Grid, xyz_arr: Tuple[List[float]]):
    print("CALCULATE INTERSECTION", flush=True)
    polyline = create_polyline(xyz_arr)
    poly_xy = []
    for xy in xyz_arr:
        poly_xy.extend([xy[0], xy[1]])

    esgrid = xtgeo_grid_to_vtk_explicit_structured_grid(grid_geometry)
    sliced_grid = cut_along_polyline(esgrid, poly_xy)
    original_cell_indices_np = [
        int(c)
        for c in vtk_to_numpy(
            sliced_grid.GetCellData().GetAbstractArray("vtkOriginalCellIds")
        )
    ]

    flattened_grid = flatten_sliced_grid(
        sliced_grid, polyline, original_cell_ids=original_cell_indices_np
    )
    coords = grid_to_numpy(flattened_grid)
    triangles = get_triangles(flattened_grid)
    original_cell_indices_np = [
        int(c)
        for c in vtk_to_numpy(
            flattened_grid.GetCellData().GetAbstractArray("vtkOriginalCellIds")
        )
    ]

    return (coords, triangles, original_cell_indices_np, polyline)
