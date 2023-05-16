# type: ignore
# for now
from functools import cache
from typing import List, Tuple
import logging
import os, psutil

import numpy as np
import orjson
import xtgeo
from vtkmodules.util.numpy_support import vtk_to_numpy
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import ORJSONResponse
from src.backend.auth.auth_helper import AuthenticatedUser, AuthHelper
from src.backend.primary.routers.grid.schemas import (
    B64EncodedNumpyArray,
    GridSurface,
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
    create_polyline,
    grid_to_numpy,
    get_triangles,
)
from src.services.utils.mpl_utils import visualize_triangles_with_scalars
from src.services.utils.perf_timer import PerfTimer

router = APIRouter()
LOGGER = logging.getLogger(__name__)


@router.get("/grid_surface", response_model=GridSurface)
async def grid_surface(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    realization = request.query_params.get("realization")

    # Get Xtgeo grid
    xtgeo_grid = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realization,
    )

    # Get grid information from xtgeo (xmin, ymin, etc...)
    grid_geometrics = xtgeo_grid.get_geometrics(allcells=True, return_dict=True)

    # Get grid surface (visible cells)
    grid_surface = get_grid_surface(grid_geometry=xtgeo_grid)

    # Extract points and polygons from surface
    points_np = (
        vtk_to_numpy(grid_surface.polydata.GetPoints().GetData())
        .ravel()
        .astype(np.float32)
    )
    polys_np = vtk_to_numpy(grid_surface.polydata.GetPolys().GetData()).astype(np.int64)

    # Reduce precision of points to 2 decimals
    points_np = np.around(points_np, decimals=2)

    grid_surface_payload = GridSurface(
        points=b64_encode_numpy(points_np),
        polys=b64_encode_numpy(polys_np),
        **grid_geometrics,
    )
    return ORJSONResponse(grid_surface_payload.dict())


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

    # Get Xtgeo grid
    xtgeo_grid = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realization,
    )
    # Get grid surface (visible cells)
    grid_polydata = get_grid_surface(grid_geometry=xtgeo_grid)

    # Get Xtgeo parameter
    xtgeo_parameter = get_grid_parameter(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        parameter_name=parameter_name,
        realization=realization,
    )

    # Get scalar values from parameter
    scalar_values = get_scalar_values(
        xtgeo_parameter, cell_ids=grid_polydata.original_cell_ids
    )

    # Handle xtgeo undefined values and truncate
    scalar_values[scalar_values == -999.0] = np.nan
    scalar_values[scalar_values < np.nanmin(scalar_values)] = np.nanmin(scalar_values)
    scalar_values[scalar_values > np.nanmax(scalar_values)] = np.nanmax(scalar_values)

    return ORJSONResponse(scalar_values.tolist())


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

    timer = PerfTimer()
    # Get Xtgeo grid
    xtgeo_grid = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realization,
    )
    # Activate all cells. Should we do this?
    xtgeo_grid.activate_all()
    print(
        f"DOWNLOADED/READ CACHE: grid_geometry for {grid_name}, realization: {realization}: {round(timer.lap_s(),2)}s",
        flush=True,
    )
    # Get xtgeo parameter
    xtgeo_parameter = get_grid_parameter(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        parameter_name=parameter_name,
        realization=realization,
    )
    print(
        f"DOWNLOADED/READ CACHE: grid_parameter for {parameter_name}, realization: {realization}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # HARDCODED POLYLINE FOR TESTING
    xyz_arr = tuple(
        tuple(point)
        for point in [
            [463156.911, 5929542.294, -49.0],
            [463564.402, 5931057.803, -1293.4185],
            [463637.925, 5931184.235, -1536.9384],
            [463690.658, 5931278.837, -1616.4998],
            [463910.452, 5931688.122, -1630.5153],
            [464465.876, 5932767.761, -1656.9874],
            [464765.876, 5934767.761, -1656.9874],
        ]
    )

    # Generate intersection data
    coords, triangles, original_cell_indices_np, polyline = generate_grid_intersection(
        xtgeo_grid, xyz_arr
    )
    print(
        f"CALCULATED INTERSECTION: realization: {realization}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # Get scalar values from parameter and select only the cells that intersect with the polyline
    values = get_scalar_values(xtgeo_parameter, cell_ids=original_cell_indices_np)
    print(
        f"READ SCALAR VALUES: realization: {realization}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # Handle undefined values and truncate
    values[values < np.nanmin(values)] = np.nanmin(values)
    values[values > np.nanmax(values)] = np.nanmax(values)
    # values[values > 0.4] = 0.4
    # values = values[original_cell_indices_np]
    # scalar_values[scalar_values == -999.0] = 0

    # Get polyline coordinates
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

    # Visualize the intersection using matplotlib as a base64 encoded image
    image_data = visualize_triangles_with_scalars(
        coords, triangles, values, polyline, "55/33-A-4"
    )
    print(
        f"MATPLOTLIB IMAGE: realization: {realization}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # Get the bounding box of the intersection
    x_min, x_max = np.min(coords[:, 0]), np.max(coords[:, 0])
    y_min, y_max = np.min(coords[:, 1]), np.max(coords[:, 1])

    # Create the intersection data object
    intersection_data = GridIntersection(
        image="data:image/png;base64,{}".format(image_data),
        polyline_x=polyline_x.tolist(),
        polyline_y=polyline_y.tolist(),
        x_min=float(x_min),
        x_max=float(x_max),
        y_min=float(y_min),
        y_max=float(y_max),
    )
    return ORJSONResponse(intersection_data.__dict__)


@router.get(
    "/statistical_grid_parameter_intersection", response_model=List[float]
)  # stating response_model here instead of return type apparently disables pydantic validation of the response (https://stackoverflow.com/a/65715205)
# type: ignore
async def grid_parameter(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    """ """
    timer = PerfTimer()
    print("#" * 80, flush=True)
    print("ENTERING STATISTICAL GRID PARAMETER INTERSECTION", flush=True)
    print(
        f"Memory usage: {psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2} MB",
        flush=True,
    )
    print("-" * 80, flush=True)

    case_uuid = request.query_params.get("case_uuid")
    ensemble_name = request.query_params.get("ensemble_name")
    grid_name = request.query_params.get("grid_name")
    parameter_name = request.query_params.get("parameter_name")
    # convert json string of realizations into list
    realizations = orjson.loads(request.query_params.get("realizations"))

    grid_access = GridAccess(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    # Check that all grids have equal nx, ny, nz
    # Should raise a http exception instead of a value error
    if not grid_access.grids_have_equal_nxnynz(grid_name=grid_name):
        raise ValueError("Grids must have equal nx, ny, nz")

    # Get Xtgeo grid
    xtgeo_grid = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=0,
    )

    # Activate all cells. Should we do this?
    xtgeo_grid.activate_all()
    print(
        f"DOWNLOADED/READ CACHE: grid_geometry for {grid_name}, realization: {0}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    print("-" * 80, flush=True)
    print("GETTING GRID PARAMETERS", flush=True)

    ### Using ThreadPoolExecutor to parallelize the download of the grid parameters
    from concurrent.futures import ThreadPoolExecutor

    def worker(real):
        return get_grid_parameter(
            authenticated_user=authenticated_user,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            grid_name=grid_name,
            parameter_name=parameter_name,
            realization=real,
        )

    with ThreadPoolExecutor() as executor:
        xtgeo_parameters = list(executor.map(worker, realizations))
    print(
        f"DOWNLOADED/READ CACHE: grid_parameters for {parameter_name}, realizations: {realizations}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # HARDCODED POLYLINE FOR TESTING
    xyz_arr = tuple(
        tuple(point)
        for point in [
            [463156.911, 5929542.294, -49.0],
            [463564.402, 5931057.803, -1293.4185],
            [463637.925, 5931184.235, -1536.9384],
            [463690.658, 5931278.837, -1616.4998],
            [463910.452, 5931688.122, -1630.5153],
            [464465.876, 5932767.761, -1656.9874],
            [464765.876, 5934767.761, -1656.9874],
        ]
    )
    print("-" * 80, flush=True)
    print("GENERATING GRID INTERSECTION", flush=True)

    # Generate intersection data
    coords, triangles, original_cell_indices_np, polyline = generate_grid_intersection(
        xtgeo_grid, xyz_arr
    )
    print(
        f"CALCULATED INTERSECTION: realization: {0}: {round(timer.lap_s(),2)}s",
        flush=True,
    )
    print("-" * 80, flush=True)

    # Get scalar values for each realization
    all_scalar_values = [
        get_scalar_values(xtgeo_parameter, cell_ids=original_cell_indices_np)
        for xtgeo_parameter in xtgeo_parameters
    ]

    # Calculate the mean scalar value for each cell
    values = np.nanmean([scalar_values for scalar_values in all_scalar_values], axis=0)

    # Handle xtgeo undefined values and truncate
    values[values < np.nanmin(values)] = np.nanmin(values)
    values[values > np.nanmax(values)] = np.nanmax(values)
    values[values == -999.0] = np.nan
    print(
        f"DOWNLOADED/READ CACHE: scalar_values for {parameter_name}, realizations: {realizations}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # Get polyline coordinates
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
    print("-" * 80, flush=True)

    print("GENERATE MATPLOTLIB IMAGE", flush=True)

    # Visualize the intersection using matplotlib as a base64 encoded image
    image_data = visualize_triangles_with_scalars(
        coords, triangles, values, polyline, "55/33-A-4"
    )
    print(
        f"GENERATED MATPLOTLIB IMAGE: {parameter_name}, realization: {0}: {round(timer.lap_s(),2)}s",
        flush=True,
    )

    # Get the bounding box of the intersection
    x_min, x_max = np.min(coords[:, 0]), np.max(coords[:, 0])
    y_min, y_max = np.min(coords[:, 1]), np.max(coords[:, 1])

    # Create the intersection data object
    intersection_data = GridIntersection(
        image="data:image/png;base64,{}".format(image_data),
        polyline_x=polyline_x.tolist(),
        polyline_y=polyline_y.tolist(),
        x_min=float(x_min),
        x_max=float(x_max),
        y_min=float(y_min),
        y_max=float(y_max),
    )

    print("-" * 80, flush=True)
    print("EXITING STATISTICAL GRID PARAMETER INTERSECTION", flush=True)
    print(
        f"Memory usage: {psutil.Process(os.getpid()).memory_info().rss / 1024 ** 2} MB",
        flush=True,
    )
    print("#" * 80, flush=True)

    return ORJSONResponse(intersection_data.__dict__)


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
    # convert json string of realizations into list
    realizations = orjson.loads(request.query_params.get("realizations"))

    grid_access = GridAccess(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    # Check that all grids have equal nx, ny, nz
    # Should riase a http exception instead of a value error
    if not grid_access.grids_have_equal_nxnynz(grid_name=grid_name):
        raise ValueError("Grids must have equal nx, ny, nz")

    xtgeo_grid = get_grid_geometry(
        authenticated_user=authenticated_user,
        case_uuid=case_uuid,
        ensemble_name=ensemble_name,
        grid_name=grid_name,
        realization=realizations[0],
    )

    # Get grid surface (visible cells)
    grid_polydata = get_grid_surface(grid_geometry=xtgeo_grid)

    # Get the xtgeo grid parameters for each realization
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

    # Get the scalar values for each parameter
    all_scalar_values = [
        get_scalar_values(xtgeo_parameter, cell_ids=grid_polydata.original_cell_ids)
        for xtgeo_parameter in xtgeo_parameters
    ]

    # Calculate the mean scalar values for each cell
    mean_scalar_values = np.nanmean(
        [scalar_values for scalar_values in all_scalar_values], axis=0
    )

    # Handle xtgeo undefined values and truncate
    mean_scalar_values[mean_scalar_values == -999.0] = np.nan
    mean_scalar_values[mean_scalar_values < np.nanmin(mean_scalar_values)] = np.nanmin(
        mean_scalar_values
    )
    mean_scalar_values[mean_scalar_values > np.nanmax(mean_scalar_values)] = np.nanmax(
        mean_scalar_values
    )

    return ORJSONResponse(mean_scalar_values.tolist())


@cache
def get_grid_geometry(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
    grid_name: str,
    realization: int,
) -> xtgeo.Grid:
    """Get the xtgeo grid geometry for a given realization"""
    token = authenticated_user.get_sumo_access_token()
    grid_access = GridAccess(token, case_uuid, ensemble_name)
    grid_geometry = grid_access.get_grid_geometry(grid_name, int(realization))

    return grid_geometry


@cache
def get_grid_surface(grid_geometry: xtgeo.Grid) -> VtkGridSurface:
    grid_surface = get_surface(grid_geometry)

    return grid_surface


@cache
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

    grid_parameter = grid_access.get_grid_parameter(
        grid_name, parameter_name, int(realization)
    )

    return grid_parameter


@cache
def generate_grid_intersection(grid_geometry: xtgeo.Grid, xyz_arr: Tuple[List[float]]):
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
