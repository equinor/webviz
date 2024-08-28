import asyncio
import logging
from typing import Annotated, List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body, status
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.sumo_access.case_inspector import CaseInspector
from primary.services.sumo_access.surface_access import SurfaceAccess
from primary.services.smda_access.stratigraphy_access import StratigraphyAccess, StratigraphicUnit
from primary.services.smda_access.stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from primary.services.smda_access.mocked_drogon_smda_access import _mocked_stratigraphy_access
from primary.services.utils.statistic_function import StatisticFunction
from primary.services.utils.surface_intersect_with_polyline import intersect_surface_with_polyline
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.services.surface_query_service.surface_query_service import batch_sample_surface_in_points_async
from primary.services.surface_query_service.surface_query_service import RealizationSampleResult
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from . import converters
from . import schemas
from . import dependencies

from .surface_address import RealizationSurfaceAddress, ObservedSurfaceAddress, StatisticalSurfaceAddress
from .surface_address import decode_surf_addr_str


LOGGER = logging.getLogger(__name__)

router = APIRouter()


GENERAL_SURF_ADDR_DOC_STR = """

---
*General description of the types of surface addresses that exist. The specific address types supported by this endpoint can be a subset of these.*

- *REAL* - Realization surface address. Addresses a specific realization surface within an ensemble. Always specifies a single realization number
- *OBS* - Observed surface address. Addresses an observed surface which is not associated with any specific ensemble.
- *STAT* - Statistical surface address. Fully specifies a statistical surface, including the statistic function and which realizations to include.
- *PARTIAL* - Partial surface address. Similar to a realization surface address, but does not include a specific realization number.

Structure of the different types of address strings:

```
REAL~~<case_uuid>~~<ensemble>~~<surface_name>~~<attribute>~~<realization>[~~<iso_date_or_interval>]
STAT~~<case_uuid>~~<ensemble>~~<surface_name>~~<attribute>~~<stat_function>~~<stat_realizations>[~~<iso_date_or_interval>]
OBS~~<case_uuid>~~<surface_name>~~<attribute>~~<iso_date_or_interval>
PARTIAL~~<case_uuid>~~<ensemble>~~<surface_name>~~<attribute>[~~<iso_date_or_interval>]
```

The `<stat_realizations>` component in a *STAT* address contains the list of realizations to include in the statistics
encoded as a `UintListStr` or "*" to include all realizations.

"""


@router.get("/realization_surfaces_metadata/")
async def get_realization_surfaces_metadata(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.SurfaceMetaSet:
    """
    Get metadata for realization surfaces in a Sumo ensemble
    """
    perf_metrics = ResponsePerfMetrics(response)

    async with asyncio.TaskGroup() as tg:
        access = SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
        surf_meta_task = tg.create_task(access.get_realization_surfaces_metadata_async())
        surf_meta_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-meta"))

        strat_units_task = tg.create_task(_get_stratigraphic_units_for_case_async(authenticated_user, case_uuid))
        strat_units_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-strat"))

    perf_metrics.reset_lap_timer()
    sumo_surf_meta_set = surf_meta_task.result()
    strat_units = strat_units_task.result()

    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)
    api_surf_meta_set = converters.to_api_surface_meta_set(sumo_surf_meta_set, sorted_stratigraphic_surfaces)
    perf_metrics.record_lap("compose")

    LOGGER.info(f"Got metadata for realization surfaces in: {perf_metrics.to_string()}")

    return api_surf_meta_set


@router.get("/observed_surfaces_metadata/")
async def get_observed_surfaces_metadata(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
) -> schemas.SurfaceMetaSet:
    """
    Get metadata for observed surfaces in a Sumo case
    """
    perf_metrics = ResponsePerfMetrics(response)

    async with asyncio.TaskGroup() as tg:
        access = SurfaceAccess.from_case_uuid_no_iteration(authenticated_user.get_sumo_access_token(), case_uuid)
        surf_meta_task = tg.create_task(access.get_observed_surfaces_metadata_async())
        surf_meta_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-meta"))

        strat_units_task = tg.create_task(_get_stratigraphic_units_for_case_async(authenticated_user, case_uuid))
        strat_units_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-strat"))

    perf_metrics.reset_lap_timer()
    sumo_surf_meta_set = surf_meta_task.result()
    strat_units = strat_units_task.result()

    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)
    api_surf_meta_set = converters.to_api_surface_meta_set(sumo_surf_meta_set, sorted_stratigraphic_surfaces)
    perf_metrics.record_lap("compose")

    LOGGER.info(f"Got metadata for observed surfaces in: {perf_metrics.to_string()}")

    return api_surf_meta_set


@router.get("/surface_data", description="Get surface data for the specified surface." + GENERAL_SURF_ADDR_DOC_STR)
async def get_surface_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    surf_addr_str: Annotated[str, Query(description="Surface address string, supported address types are *REAL*, *OBS* and *STAT*")],
    data_format: Annotated[Literal["float", "png"], Query(description="Format of binary data in the response")] = "float",
    resample_to: Annotated[schemas.SurfaceDef | None, Depends(dependencies.get_resample_to_param_from_keyval_str)] = None,
    # fmt:on
) -> schemas.SurfaceDataFloat | schemas.SurfaceDataPng:
    perf_metrics = ResponsePerfMetrics(response)

    access_token = authenticated_user.get_sumo_access_token()

    addr = decode_surf_addr_str(surf_addr_str)
    if not isinstance(addr, RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress):
        raise HTTPException(status_code=404, detail="Endpoint only supports address types REAL, OBS and STAT")

    if addr.address_type == "REAL":
        access = SurfaceAccess.from_case_uuid(access_token, addr.case_uuid, addr.ensemble_name)
        xtgeo_surf = await access.get_realization_surface_data_async(
            real_num=addr.realization,
            name=addr.name,
            attribute=addr.attribute,
            time_or_interval_str=addr.iso_time_or_interval,
        )
        perf_metrics.record_lap("get-surf")
        if not xtgeo_surf:
            raise HTTPException(status_code=404, detail="Could not get realization surface")

    elif addr.address_type == "STAT":
        service_stat_func_to_compute = StatisticFunction.from_string_value(addr.stat_function)
        if service_stat_func_to_compute is None:
            raise HTTPException(status_code=404, detail="Invalid statistic requested")

        access = SurfaceAccess.from_case_uuid(access_token, addr.case_uuid, addr.ensemble_name)
        xtgeo_surf = await access.get_statistical_surface_data_async(
            statistic_function=service_stat_func_to_compute,
            name=addr.name,
            attribute=addr.attribute,
            realizations=addr.stat_realizations,
            time_or_interval_str=addr.iso_time_or_interval,
        )
        perf_metrics.record_lap("sumo-calc")
        if not xtgeo_surf:
            raise HTTPException(status_code=404, detail="Could not get or compute statistical surface")

    elif addr.address_type == "OBS":
        access = SurfaceAccess.from_case_uuid_no_iteration(access_token, addr.case_uuid)
        xtgeo_surf = await access.get_observed_surface_data_async(
            name=addr.name, attribute=addr.attribute, time_or_interval_str=addr.iso_time_or_interval
        )
        perf_metrics.record_lap("get-surf")
        if not xtgeo_surf:
            raise HTTPException(status_code=404, detail="Could not get observed surface")

    if resample_to is not None:
        xtgeo_surf = converters.resample_to_surface_def(xtgeo_surf, resample_to)
        perf_metrics.record_lap("resample")

    surf_data_response: schemas.SurfaceDataFloat | schemas.SurfaceDataPng
    if data_format == "float":
        surf_data_response = converters.to_api_surface_data_float(xtgeo_surf)
    elif data_format == "png":
        surf_data_response = converters.to_api_surface_data_png(xtgeo_surf)

    perf_metrics.record_lap("convert")

    LOGGER.info(f"Got {addr.address_type} surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.post("/get_surface_intersection")
async def post_get_surface_intersection(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization_num: int = Query(description="Realization number"),
    name: str = Query(description="Surface name"),
    attribute: str = Query(description="Surface attribute"),
    time_or_interval_str: Optional[str] = Query(None, description="Time point or time interval string"),
    cumulative_length_polyline: schemas.SurfaceIntersectionCumulativeLengthPolyline = Body(embed=True),
) -> schemas.SurfaceIntersectionData:
    """Get surface intersection data for requested surface name.

    The surface intersection data for surface name contains: An array of z-points, i.e. one z-value/depth per (x, y)-point in polyline,
    and cumulative lengths, the accumulated length at each z-point in the array.
    """
    access = SurfaceAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    surface = await access.get_realization_surface_data_async(
        real_num=realization_num, name=name, attribute=attribute, time_or_interval_str=time_or_interval_str
    )
    if surface is None:
        raise HTTPException(status_code=404, detail="Surface '{name}' not found")

    # Ensure name is applied
    surface.name = name

    intersection_polyline = converters.from_api_cumulative_length_polyline_to_xtgeo_polyline(cumulative_length_polyline)
    surface_intersection = intersect_surface_with_polyline(surface, intersection_polyline)

    surface_intersection_response = converters.to_api_surface_intersection(surface_intersection)

    return surface_intersection_response


@router.post("/sample_surface_in_points")
async def post_sample_surface_in_points(
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    surface_name: str = Query(description="Surface name"),
    surface_attribute: str = Query(description="Surface attribute"),
    realization_nums: List[int] = Query(description="Realization numbers"),
    sample_points: schemas.PointSetXY = Body(embed=True),
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.SurfaceRealizationSampleValues]:

    sumo_access_token = authenticated_user.get_sumo_access_token()

    result_arr: List[RealizationSampleResult] = await batch_sample_surface_in_points_async(
        sumo_access_token=sumo_access_token,
        case_uuid=case_uuid,
        iteration_name=ensemble_name,
        surface_name=surface_name,
        surface_attribute=surface_attribute,
        realizations=realization_nums,
        x_coords=sample_points.x_points,
        y_coords=sample_points.y_points,
    )

    intersections: List[schemas.SurfaceRealizationSampleValues] = []
    for res in result_arr:
        intersections.append(
            schemas.SurfaceRealizationSampleValues(
                realization=res.realization,
                sampled_values=res.sampledValues,
            )
        )

    return intersections


@router.get("/delta_surface_data")
async def get_delta_surface_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    surf_a_addr_str: Annotated[str, Query(description="Address string of surface A, supported types: *REAL*, *OBS* and *STAT*")],
    surf_b_addr_str: Annotated[str, Query(description="Address string of surface B, supported types: *REAL*, *OBS* and *STAT*")],
    data_format: Annotated[Literal["float", "png"], Query(description="Format of binary data in the response")] = "float",
    resample_to: Annotated[schemas.SurfaceDef | None, Depends(dependencies.get_resample_to_param_from_keyval_str)] = None,
    # fmt:on
) -> list[schemas.SurfaceDataFloat]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


@router.get("/misfit_surface_data")
async def get_misfit_surface_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    obs_surf_addr_str: Annotated[str, Query(description="Address of observed surface, only supported address type is *OBS*")],
    sim_surf_addr_str: Annotated[str, Query(description="Address of simulated surface, supported type is *PARTIAL*")],
    statistic_functions: Annotated[list[schemas.SurfaceStatisticFunction], Query(description="Statistics to calculate")],
    realizations: Annotated[list[int], Query(description="Realization numbers")],
    data_format: Annotated[Literal["float", "png"], Query(description="Format of binary data in the response")] = "float",
    resample_to: Annotated[schemas.SurfaceDef | None, Depends(dependencies.get_resample_to_param_from_keyval_str)] = None,
    # fmt:on
) -> list[schemas.SurfaceDataFloat]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


async def _get_stratigraphic_units_for_case_async(
    authenticated_user: AuthenticatedUser, case_uuid: str
) -> list[StratigraphicUnit]:
    perf_metrics = PerfMetrics()

    case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    strat_column_identifier = await case_inspector.get_stratigraphic_column_identifier_async()
    perf_metrics.record_lap("get-strat-ident")

    strat_access: StratigraphyAccess | _mocked_stratigraphy_access.StratigraphyAccess
    if strat_column_identifier == "DROGON_HAS_NO_STRATCOLUMN":
        strat_access = _mocked_stratigraphy_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    else:
        strat_access = StratigraphyAccess(authenticated_user.get_smda_access_token())

    strat_units = await strat_access.get_stratigraphic_units(strat_column_identifier)
    perf_metrics.record_lap("get-strat-units")

    LOGGER.info(f"Got stratigraphic units for case in : {perf_metrics.to_string()}")

    return strat_units
