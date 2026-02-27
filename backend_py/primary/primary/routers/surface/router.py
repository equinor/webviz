import asyncio
import logging
from typing import Annotated, List, Optional, Literal

import xtgeo
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Body, status

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_core_utils.type_utils import expect_type
from webviz_services.sumo_access.case_inspector import CaseInspector
from webviz_services.sumo_access.surface_access import SurfaceAccess
from webviz_services.sumo_access.surface_access import ExpectedError, InProgress
from webviz_services.smda_access import SmdaAccess, StratigraphicUnit
from webviz_services.smda_access.stratigraphy_utils import sort_stratigraphic_names_by_hierarchy
from webviz_services.smda_access.drogon import DrogonSmdaAccess
from webviz_services.utils.statistic_function import StatisticFunction
from webviz_services.utils.surface_intersect_with_polyline import intersect_surface_with_polyline
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.task_meta_tracker import get_task_meta_tracker_for_user
from webviz_services.surface_query_service.surface_query_service import batch_sample_surface_in_points_async
from webviz_services.surface_query_service.surface_query_service import RealizationSampleResult
from webviz_services.service_exceptions import ServiceLayerException

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, set_cache_time, CacheTime
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.utils.drogon import is_drogon_identifier

from .._shared.long_running_operations import LroInProgressResp, LroFailureResp, LroSuccessResp

from . import converters
from . import schemas
from . import dependencies
from . import task_helpers

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
@cache_time(CacheTime.LONG)
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

    try:
        async with asyncio.TaskGroup() as tg:
            access = SurfaceAccess.from_ensemble_name(
                authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
            )
            case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)

            surf_meta_task = tg.create_task(access.get_realization_surfaces_metadata_async())
            surf_meta_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-meta"))

            strat_column_ident = await case_inspector.get_stratigraphic_column_identifier_async()
            strat_units_task = tg.create_task(
                _get_stratigraphic_units_for_strat_column_async(authenticated_user, strat_column_ident)
            )
            strat_units_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-strat"))
    except* ServiceLayerException as exc_group:
        for exc in exc_group.exceptions:
            raise exc from exc_group  # Reraise the first exception

    perf_metrics.reset_lap_timer()
    sumo_surf_meta_set = surf_meta_task.result()
    strat_units = strat_units_task.result()

    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)
    api_surf_meta_set = converters.to_api_surface_meta_set(sumo_surf_meta_set, sorted_stratigraphic_surfaces)
    perf_metrics.record_lap("compose")

    LOGGER.info(f"Got metadata for realization surfaces in: {perf_metrics.to_string()}")

    return api_surf_meta_set


@router.get("/observed_surfaces_metadata/")
@cache_time(CacheTime.LONG)
async def get_observed_surfaces_metadata(
    response: Response,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
) -> schemas.SurfaceMetaSet:
    """
    Get metadata for observed surfaces in a Sumo case
    """
    perf_metrics = ResponsePerfMetrics(response)

    try:
        async with asyncio.TaskGroup() as tg:
            access = SurfaceAccess.from_case_uuid_no_ensemble(authenticated_user.get_sumo_access_token(), case_uuid)
            case_inspector = CaseInspector.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)

            surf_meta_task = tg.create_task(access.get_observed_surfaces_metadata_async())
            surf_meta_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-meta"))

            strat_column_ident = await case_inspector.get_stratigraphic_column_identifier_async()
            strat_units_task = tg.create_task(
                _get_stratigraphic_units_for_strat_column_async(authenticated_user, strat_column_ident)
            )
            strat_units_task.add_done_callback(lambda _: perf_metrics.record_lap_no_reset("get-strat"))
    except* ServiceLayerException as exc_group:
        for exc in exc_group.exceptions:
            raise exc from exc_group  # Reraise the first exception

    perf_metrics.reset_lap_timer()
    sumo_surf_meta_set = surf_meta_task.result()
    strat_units = strat_units_task.result()

    sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)
    api_surf_meta_set = converters.to_api_surface_meta_set(sumo_surf_meta_set, sorted_stratigraphic_surfaces)
    perf_metrics.record_lap("compose")

    LOGGER.info(f"Got metadata for observed surfaces in: {perf_metrics.to_string()}")

    return api_surf_meta_set


@router.get("/surface_data", description="Get surface data for the specified surface." + GENERAL_SURF_ADDR_DOC_STR)
@cache_time(CacheTime.LONG)
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

    xtgeo_surf: xtgeo.RegularSurface | None = None
    if addr.address_type == "REAL":
        access = SurfaceAccess.from_ensemble_name(access_token, addr.case_uuid, addr.ensemble_name)
        xtgeo_surf = await access.get_realization_surface_data_async(
            real_num=addr.realization,
            name=addr.name,
            attribute=addr.attribute,
            time_or_interval_str=addr.iso_time_or_interval,
        )
        perf_metrics.record_lap("get-surf")

    elif addr.address_type == "STAT":
        service_stat_func_to_compute = StatisticFunction.from_string_value(addr.stat_function)
        if service_stat_func_to_compute is None:
            raise HTTPException(status_code=404, detail="Invalid statistic requested")

        access = SurfaceAccess.from_ensemble_name(access_token, addr.case_uuid, addr.ensemble_name)
        xtgeo_surf = await access.get_statistical_surface_data_async(
            statistic_function=service_stat_func_to_compute,
            name=addr.name,
            attribute=addr.attribute,
            realizations=addr.stat_realizations,
            time_or_interval_str=addr.iso_time_or_interval,
        )
        perf_metrics.record_lap("sumo-calc")

    elif addr.address_type == "OBS":
        access = SurfaceAccess.from_case_uuid_no_ensemble(access_token, addr.case_uuid)
        xtgeo_surf = await access.get_observed_surface_data_async(
            name=addr.name, attribute=addr.attribute, time_or_interval_str=addr.iso_time_or_interval
        )
        perf_metrics.record_lap("get-surf")

    if not xtgeo_surf:
        raise HTTPException(status_code=500, detail="Did not get a valid xtgeo surface from Sumo")

    surf_data_response = _resample_and_convert_to_surface_data_response(
        xtgeo_surf=xtgeo_surf, resample_to=resample_to, data_format=data_format, perf_metrics=perf_metrics
    )

    LOGGER.info(f"Got {addr.address_type} surface in: {perf_metrics.to_string()}")

    return surf_data_response


@router.get("/statistical_surface_data/hybrid")
async def get_statistical_surface_data_hybrid(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    surf_addr_str: Annotated[str, Query(description="Surface address string, supported address type is *STAT*")],
    data_format: Annotated[Literal["float", "png"], Query(description="Format of binary data in the response")] = "float",
    resample_to: Annotated[schemas.SurfaceDef | None, Depends(dependencies.get_resample_to_param_from_keyval_str)] = None,
    # fmt:on
) -> LroSuccessResp[schemas.SurfaceDataFloat | schemas.SurfaceDataPng] | LroInProgressResp | LroFailureResp:

    perf_metrics = ResponsePerfMetrics(response)

    # LOGGER.debug(f"Entering HYBRID endpoint for statistical surface data  for address: {surf_addr_str}")

    addr = decode_surf_addr_str(surf_addr_str)
    if not isinstance(addr, StatisticalSurfaceAddress):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Endpoint only supports address type STAT")

    access_token = authenticated_user.get_sumo_access_token()
    access = SurfaceAccess.from_ensemble_name(access_token, addr.case_uuid, addr.ensemble_name)
    task_tracker = get_task_meta_tracker_for_user(authenticated_user)
    perf_metrics.record_lap("init")

    # !!!!!!!!!!!!!
    # Todo!
    # We need to come up with a way to bust the task tracker cache in cases where tasks get "stuck".
    # One way of achieving this may be to have a separate endpoint to clear the task tracker cache for the user.
    task_fp = await task_helpers.determine_surf_task_fingerprint_async(authenticated_user, addr)
    perf_metrics.record_lap("fingerprint")

    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    perf_metrics.record_lap("task-meta")

    new_sumo_task_was_submitted = False
    if not task_meta:
        task_meta = await task_helpers.submit_and_track_stat_surf_task_async(access, addr, task_tracker, task_fp)
        LOGGER.info(f"Submitted new statistical surface calculation task for address: {surf_addr_str}")
        new_sumo_task_was_submitted = True
        perf_metrics.record_lap("submit")

    try:
        maybe_xtgeo_surf = await access.poll_statistical_surface_calculation_task_async(
            sumo_task_id=task_meta.task_id, timeout_s=0
        )
        perf_metrics.record_lap("poll")

        if isinstance(maybe_xtgeo_surf, ExpectedError):
            await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
            return task_helpers.make_lro_failure_resp(maybe_xtgeo_surf)

        if isinstance(maybe_xtgeo_surf, InProgress):
            LOGGER.info(f"Returning in-progress for statistical surface task (hybrid) in: {perf_metrics.to_string()}")
            response.status_code = status.HTTP_202_ACCEPTED
            return task_helpers.make_lro_in_progress_resp(task_meta, new_sumo_task_was_submitted, maybe_xtgeo_surf)

        # We should now be left with a xtgeo RegularSurface
        xtgeo_surf: xtgeo.RegularSurface = expect_type(maybe_xtgeo_surf, xtgeo.RegularSurface)
        api_surf_data = _resample_and_convert_to_surface_data_response(
            xtgeo_surf=xtgeo_surf, resample_to=resample_to, data_format=data_format, perf_metrics=perf_metrics
        )

        LOGGER.info(f"Got statistical surface data (hybrid) in: {perf_metrics.to_string()}")

        set_cache_time(CacheTime.NORMAL)
        return LroSuccessResp(status="success", result=api_surf_data)

    except Exception as _exc:
        # Must delete the fingerprint mapping so that the next call to this endpoint starts fresh.
        # Then just re-raise the exception and let our middleware handle it
        await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
        raise


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
    access = SurfaceAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    surface = await access.get_realization_surface_data_async(
        real_num=realization_num, name=name, attribute=attribute, time_or_interval_str=time_or_interval_str
    )

    # Ensure name is applied
    surface.name = name

    intersection_polyline = converters.from_api_cumulative_length_polyline_to_xtgeo_polyline(cumulative_length_polyline)
    surface_intersection = intersect_surface_with_polyline(surface, intersection_polyline)

    surface_intersection_response = converters.to_api_surface_intersection(surface_intersection)

    return surface_intersection_response


@router.post("/get_sample_surface_in_points")
async def post_get_sample_surface_in_points(
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
        ensemble_name=ensemble_name,
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
    realizations_encoded_as_uint_list_str: Annotated[str | None, Query(description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included.")] = None,
    data_format: Annotated[Literal["float", "png"], Query(description="Format of binary data in the response")] = "float",
    resample_to: Annotated[schemas.SurfaceDef | None, Depends(dependencies.get_resample_to_param_from_keyval_str)] = None,
    # fmt:on
) -> list[schemas.SurfaceDataFloat]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)


async def _get_stratigraphic_units_for_strat_column_async(
    authenticated_user: AuthenticatedUser, strat_column_identifier: str
) -> list[StratigraphicUnit]:
    perf_metrics = PerfMetrics()

    smda_access: SmdaAccess | DrogonSmdaAccess
    if is_drogon_identifier(strat_column_identifier=strat_column_identifier):
        smda_access = DrogonSmdaAccess()
    else:
        smda_access = SmdaAccess(authenticated_user.get_smda_access_token())

    strat_units = await smda_access.get_stratigraphic_units_async(strat_column_identifier)
    perf_metrics.record_lap("get-strat-units")

    LOGGER.info(f"Got stratigraphic units for case in : {perf_metrics.to_string()}")

    return strat_units


def _resample_and_convert_to_surface_data_response(
    xtgeo_surf: xtgeo.RegularSurface,
    resample_to: schemas.SurfaceDef | None,
    data_format: Literal["float", "png"],
    perf_metrics: ResponsePerfMetrics,
) -> schemas.SurfaceDataFloat | schemas.SurfaceDataPng:
    """
    Helper to do both resampling (if any) and conversion to API response format.
    """
    if resample_to is not None:
        xtgeo_surf = converters.resample_to_surface_def(xtgeo_surf, resample_to)
        perf_metrics.record_lap("resample")

    surf_data_response: schemas.SurfaceDataFloat | schemas.SurfaceDataPng
    if data_format == "float":
        surf_data_response = converters.to_api_surface_data_float(xtgeo_surf)
    elif data_format == "png":
        surf_data_response = converters.to_api_surface_data_png(xtgeo_surf)

    perf_metrics.record_lap("convert")

    return surf_data_response
