import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from ....services.sumo_access.surface_access import SurfaceAccess
from ....services.utils.authenticated_user import AuthenticatedUser
from ....services.utils.perf_timer import PerfTimer
from ...auth.auth_helper import AuthHelper
from . import converters
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dynamic_surface_directory/")
def get_dynamic_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.DynamicSurfaceDirectory:
    """
    Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
    """
    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    surf_dir = access.get_dynamic_surf_dir()

    ret_dir = schemas.DynamicSurfaceDirectory(
        names=surf_dir.names, attributes=surf_dir.attributes, time_or_interval_strings=surf_dir.date_strings
    )

    return ret_dir


@router.get("/static_surface_directory/")
def get_static_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.StaticSurfaceDirectory:
    """
    Get a directory of surface names and attributes for static surfaces.
    These are the non-observed surfaces that do NOT have time stamps
    """
    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    surf_dir = access.get_static_surf_dir()

    ret_dir = schemas.StaticSurfaceDirectory(names=surf_dir.names, attributes=surf_dir.attributes)

    return ret_dir


@router.get("/static_surface_data/")
def get_static_surface_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
) -> schemas.SurfaceData:

    timer = PerfTimer()

    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf = access.get_static_surf(
    real_num=realization_num,
    name=name,
    attribute=attribute)

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)

    LOGGER.debug(f"Loaded surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response


@router.get("/dynamic_surface_data/")
def get_dynamic_surface_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval: str = Query(description="Timestamp or time interval string"),
) -> schemas.SurfaceData:

    timer = PerfTimer()

    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf = access.get_dynamic_surf(
    real_num=realization_num,
    name=name,
    attribute=attribute,
    time_or_interval_str=time_or_interval)

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)

    LOGGER.debug(f"Loaded surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response
