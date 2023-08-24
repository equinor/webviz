import logging
from typing import List
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, Body
import orjson as json

from src.services.sumo_access import SurfaceAccess, SeismicAccess, GridAccess
from src.services.oneseismic_access.vds_access import VdsAccess

from src.services.utils.authenticated_user import AuthenticatedUser

from src.backend.auth.auth_helper import AuthHelper
from . import schemas


router = APIRouter()


@router.post("/surfaces/")
def get_surfaces(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    names: List[str] = Query(description="Surface names"),
    attribute: str = Query(description="Surface attribute"),
    cutting_plane: schemas.CuttingPlane = Body(alias="cuttingPlane", embed=True),
) -> List[schemas.SurfaceIntersectionData]:
    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    intersections = []

    fence_arr = np.array(
        [cutting_plane.x_arr, cutting_plane.y_arr, np.zeros(len(cutting_plane.y_arr)), cutting_plane.h_arr]
    ).T

    for name in names:
        try:
            xtgeo_surf = access.get_static_surf(real_num=realization_num, name=name, attribute=attribute)
            line = xtgeo_surf.get_randomline(fence_arr)
            intersections.append(
                schemas.SurfaceIntersectionData(name=f"{name}", hlen_arr=line[:, 0].tolist(), z_arr=line[:, 1].tolist())
            )
        except AttributeError:
            print(f"Could not find surface {name} with attribute {attribute}-{realization_num}")

    return intersections


@router.post("/grid_parameter/")
async def get_grid_parameter(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    grid_name: str = Query(description="Grid name"),
    parameter_name: str = Query(description="Grid parameter"),
    realization: int = Query(description="Realization"),
    cutting_plane: schemas.CuttingPlane = Body(alias="cuttingPlane", embed=True),
) -> schemas.CubeIntersectionData:
    """Get a grid parameter"""
    grid_access = GridAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    grid_geometry = grid_access.get_grid_geometry(grid_name, int(realization))
    grid_property = grid_access.get_grid_parameter(grid_name, parameter_name, int(realization))
    grid_property.name = parameter_name
    grid_geometry._filesrc = "grid"
    grid_property._filesrc = "gridprop"
    grid_geometry.append_prop(grid_property)
    print("Starting to get random line")
    from src.services.utils.perf_timer import PerfTimer

    timer = PerfTimer()

    fence_arr = np.array(
        [cutting_plane.x_arr, cutting_plane.y_arr, np.zeros(len(cutting_plane.y_arr)), cutting_plane.h_arr]
    ).T
    hmin, hmax, vmin, vmax, ndarray2d = grid_geometry.get_randomline(fence_arr, parameter_name)
    print("Got random line", timer.lap_s())
    print(np.nanmin(ndarray2d), np.nanmax(ndarray2d))
    # ndarray2d = np.clip(ndarray2d, 0.25, 0.35)

    return schemas.CubeIntersectionData(
        xy_arr_string=json.dumps(ndarray2d.tolist()),
        z_arr_string=json.dumps(np.linspace(vmin, vmax, len(ndarray2d)).tolist()),
    )


@router.post("/seismic/")
def get_seismic(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    seismic_cube_attribute: str = Query(description="Seismic cube attribute"),
    seismic_timestamp_or_timestep: str = Query(description="Timestamp or timestep"),
    observed: bool = Query(description="Observed or simulated"),
    cutting_plane: schemas.CuttingPlane = Body(alias="cuttingPlane", embed=True),
) -> schemas.CubeIntersectionData:
    seismic_access = SeismicAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    timestamp = None
    timestep = None
    if "--" in seismic_timestamp_or_timestep:
        timestep = seismic_timestamp_or_timestep
    else:
        timestamp = seismic_timestamp_or_timestep

    try:
        vds_handle = seismic_access.get_vds_handle(
            realization=realization_num,
            iteration=ensemble_name,
            cube_tagname=seismic_cube_attribute,
            timestep=timestep,
            timestamp=timestamp,
            observed=observed,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    vdsaccess = VdsAccess(vds_handle)

    vals, meta = vdsaccess.get_fence(
        coordinate_system="cdp", coordinates=[[x, y] for x, y in zip(cutting_plane.x_arr, cutting_plane.y_arr)]
    )

    meta = vdsaccess.get_metadata()
    tvd_meta = meta.get("axis")[2]

    tvd_values = np.linspace(tvd_meta["min"], tvd_meta["max"], tvd_meta["samples"])

    return schemas.CubeIntersectionData(
        xy_arr_string=json.dumps(vals.T.tolist()),  # pylint: disable=no-member
        z_arr_string=json.dumps(tvd_values.tolist()),  # pylint: disable=no-member
    )
