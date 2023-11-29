import logging
from typing import List, Union, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from src.services.sumo_access.surface_access import SurfaceAccess
from src.services.smda_access.stratigraphy_access import StratigraphyAccess
from src.services.smda_access.stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from src.services.smda_access.mocked_drogon_smda_access import _mocked_stratigraphy_access
from src.services.utils.statistic_function import StatisticFunction
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.backend.auth.auth_helper import AuthHelper
from src.backend.utils.perf_metrics import PerfMetrics
from src.services.sumo_access._helpers import SumoCase

from . import converters
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/surface_directory/")
async def get_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SurfaceMeta]:
    """
    Get a directory of surfaces in a Sumo ensemble
    """
    surface_access = await SurfaceAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_surf_dir = await surface_access.get_surface_directory_async()

    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    strat_column_identifier = await case_inspector.get_stratigraphic_column_identifier()
    strat_access: Union[StratigraphyAccess, _mocked_stratigraphy_access.StratigraphyAccess]

    if strat_column_identifier == "DROGON_HAS_NO_STRATCOLUMN":
        strat_access = _mocked_stratigraphy_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    else:
        strat_access = StratigraphyAccess(authenticated_user.get_smda_access_token())
    strat_units = await strat_access.get_stratigraphic_units(strat_column_identifier)
    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)

    return converters.to_api_surface_directory(sumo_surf_dir, sorted_stratigraphic_surfaces)


@router.get("/realization_surface_data/")
async def get_realization_surface_data(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    perf_metrics = PerfMetrics(response)

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf = await access.get_realization_surface_data_async(
        real_num=realization_num, name=name, attribute=attribute, time_or_interval_str=time_or_interval
    )
    perf_metrics.record_lap("get-surf")

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Surface not found")

    surf_data_response = converters.to_api_surface_data(xtgeo_surf)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Loaded realization surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.get("/statistical_surface_data/")
async def get_statistical_surface_data(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    perf_metrics = PerfMetrics(response)

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is None:
        raise HTTPException(status_code=404, detail="Invalid statistic requested")

    xtgeo_surf = await access.get_statistical_surface_data_async(
        statistic_function=service_stat_func_to_compute,
        name=name,
        attribute=attribute,
        time_or_interval_str=time_or_interval,
    )
    perf_metrics.record_lap("sumo-calc")

    if not xtgeo_surf:
        raise HTTPException(status_code=404, detail="Could not find or compute surface")

    surf_data_response: schemas.SurfaceData = converters.to_api_surface_data(xtgeo_surf)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Calculated statistical surface in: {perf_metrics.to_string()}")

    return surf_data_response


# pylint: disable=too-many-arguments
@router.get("/property_surface_resampled_to_static_surface/")
async def get_property_surface_resampled_to_static_surface(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num_mesh: int = Query(description="Realization number"),
    name_mesh: str = Query(description="Surface name"),
    attribute_mesh: str = Query(description="Surface attribute"),
    realization_num_property: int = Query(description="Realization number"),
    name_property: str = Query(description="Surface name"),
    attribute_property: str = Query(description="Surface attribute"),
    time_or_interval_property: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    perf_metrics = PerfMetrics(response)

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    xtgeo_surf_mesh = await access.get_realization_surface_data_async(
        real_num=realization_num_mesh, name=name_mesh, attribute=attribute_mesh
    )
    perf_metrics.record_lap("mesh-surf")

    xtgeo_surf_property = await access.get_realization_surface_data_async(
        real_num=realization_num_property,
        name=name_property,
        attribute=attribute_property,
        time_or_interval_str=time_or_interval_property,
    )
    perf_metrics.record_lap("prop-surf")

    if not xtgeo_surf_mesh or not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(xtgeo_surf_mesh, xtgeo_surf_property)
    perf_metrics.record_lap("resample")

    surf_data_response: schemas.SurfaceData = converters.to_api_surface_data(resampled_surface)
    perf_metrics.record_lap("convert")

    LOGGER.info(f"Loaded property surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.get("/property_surface_resampled_to_statistical_static_surface/")
async def get_property_surface_resampled_to_statistical_static_surface(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic_function: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name_mesh: str = Query(description="Surface name"),
    attribute_mesh: str = Query(description="Surface attribute"),
    # statistic_function_property: schemas.SurfaceStatisticFunction = Query(description="Statistics to calculate"),
    name_property: str = Query(description="Surface name"),
    attribute_property: str = Query(description="Surface attribute"),
    time_or_interval_property: Optional[str] = Query(None, description="Time point or time interval string"),
) -> schemas.SurfaceData:
    timer = PerfTimer()

    access = await SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    service_stat_func_to_compute = StatisticFunction.from_string_value(statistic_function)
    if service_stat_func_to_compute is not None:
        xtgeo_surf_mesh = await access.get_statistical_surface_data_async(
            statistic_function=service_stat_func_to_compute,
            name=name_mesh,
            attribute=attribute_mesh,
        )
        xtgeo_surf_property = await access.get_statistical_surface_data_async(
            statistic_function=service_stat_func_to_compute,
            name=name_property,
            attribute=attribute_property,
            time_or_interval_str=time_or_interval_property,
        )

    if not xtgeo_surf_mesh or not xtgeo_surf_property:
        raise HTTPException(status_code=404, detail="Surface not found")

    resampled_surface = converters.resample_property_surface_to_mesh_surface(xtgeo_surf_mesh, xtgeo_surf_property)

    surf_data_response = converters.to_api_surface_data(resampled_surface)

    LOGGER.info(f"Loaded property surface and created image, total time: {timer.elapsed_ms()}ms")

    return surf_data_response
