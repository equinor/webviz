import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.utils.statistic_function import StatisticFunction
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper
from src.services.sumo_access.generic_types import SumoContent

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
        names=surf_dir.names,
        attributes=surf_dir.attributes,
        time_or_interval_strings=surf_dir.date_strings,
    )

    return ret_dir


@router.get("/static_surface_directory/")
def get_static_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    sumo_content_filter: List[SumoContent] = Query(default=None, description="Optional filter by Sumo content type"),
) -> schemas.StaticSurfaceDirectory:
    """
    Get a directory of surface names and attributes for static surfaces.
    These are the non-observed surfaces that do NOT have time stamps
    """
    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    surf_dir = access.get_static_surf_dir(content_filter=sumo_content_filter)

    ret_dir = schemas.StaticSurfaceDirectory(
        names=surf_dir.names,
        attributes=surf_dir.attributes,
        valid_attributes_for_name=surf_dir.valid_attributes_for_name,
    )

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
    xtgeo_surf = access.get_static_surf(real_num=realization_num, name=name, attribute=attribute)

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)

    LOGGER.debug(f"Loaded static surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response


@router.get("/property_surface_resampled_to_static_surface/")
def get_property_surface_resampled_to_static_surface(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num_mesh: int = Query(description="Realization number"),
    name_mesh: str = Query(description="Surface name"),
    attribute_mesh: str = Query(description="Surface attribute"),
    realization_num_property: int = Query(description="Realization number"),
    name_property: str = Query(description="Surface name"),
    attribute_property: str = Query(description="Surface attribute"),
) -> schemas.SurfaceData:
    timer = PerfTimer()

    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf_mesh = access.get_static_surf(real_num=realization_num_mesh, name=name_mesh, attribute=attribute_mesh)
    xtgeo_surf_property = access.get_static_surf(
        real_num=realization_num_property, name=name_property, attribute=attribute_property
    )

    if not xtgeo_surf_mesh or not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(xtgeo_surf_mesh, xtgeo_surf_property)

    surf_data_response = converters.to_api_surface_data(resampled_surface)

    LOGGER.debug(f"Loaded property surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response


@router.get("/property_surface_resampled_to_statistical_static_surface/")
def get_property_surface_resampled_to_statistical_static_surface(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name_mesh: str = Query(description="Surface name"),
    attribute_mesh: str = Query(description="Surface attribute"),
    # statistic_function_property: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name_property: str = Query(description="Surface name"),
    attribute_property: str = Query(description="Surface attribute"),
) -> schemas.SurfaceData:
    timer = PerfTimer()

    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is not None:
        xtgeo_surf_mesh = access.get_statistical_static_surf(
            statistic_function=service_stat_func_to_compute,
            name=name_mesh,
            attribute=attribute_mesh,
        )
        xtgeo_surf_property = access.get_statistical_static_surf(
            statistic_function=service_stat_func_to_compute,
            name=name_property,
            attribute=attribute_property,
        )

    if not xtgeo_surf_mesh or not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(xtgeo_surf_mesh, xtgeo_surf_property)

    surf_data_response = converters.to_api_surface_data(resampled_surface)

    LOGGER.debug(f"Loaded property surface and created image, total time: {timer.elapsed_ms()}ms")

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
        time_or_interval_str=time_or_interval,
    )

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)

    LOGGER.debug(f"Loaded dynamic surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response


@router.get("/statistical_dynamic_surface_data/")
def get_statistical_dynamic_surface_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval: str = Query(description="Timestamp or time interval string"),
) -> schemas.SurfaceData:
    timer = PerfTimer()

    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is not None:
        xtgeo_surf = access.get_statistical_dynamic_surf(
            statistic_function=service_stat_func_to_compute,
            name=name,
            attribute=attribute,
            time_or_interval_str=time_or_interval,
        )

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Could not find or compute surface")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)

    LOGGER.debug(f"Calculated statistical dynamic surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response


@router.get("/statistical_static_surface_data/")
def get_statistical_static_surface_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
) -> schemas.SurfaceData:
    timer = PerfTimer()

    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is not None:
        xtgeo_surf = access.get_statistical_static_surf(
            statistic_function=service_stat_func_to_compute,
            name=name,
            attribute=attribute,
        )

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Could not find or compute surface")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)

    LOGGER.debug(f"Calculated statistical static surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response
