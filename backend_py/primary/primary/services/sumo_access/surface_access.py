import asyncio
import logging
from io import BytesIO
from typing import Sequence

import xtgeo

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from fmu.sumo.explorer.objects import Surface

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.utils.otel_span_tracing import otel_span_decorator, start_otel_span, start_otel_span_async
from primary.services.utils.statistic_function import StatisticFunction
from primary.services.service_exceptions import (
    Service,
    NoDataError,
    MultipleDataMatchesError,
    InvalidParameterError,
    ServiceRequestError,
)

from .surface_types import SurfaceMeta, SurfaceMetaSet
from .generic_types import SumoContent
from .queries.surface_queries import SurfTimeType, SurfInfo, TimePoint, TimeInterval
from .queries.surface_queries import RealizationSurfQueries, ObservedSurfQueries
from .sumo_client_factory import create_sumo_client


LOGGER = logging.getLogger(__name__)


class SurfaceAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str | None):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str | None = iteration_name

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "SurfaceAccess":
        sumo_client = create_sumo_client(access_token)
        return SurfaceAccess(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    @classmethod
    def from_case_uuid_no_iteration(cls, access_token: str, case_uuid: str) -> "SurfaceAccess":
        sumo_client = create_sumo_client(access_token)
        return SurfaceAccess(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=None)

    @otel_span_decorator()
    async def get_realization_surfaces_metadata_async(self) -> SurfaceMetaSet:
        if not self._iteration_name:
            raise InvalidParameterError(
                "Iteration name must be set to get metadata for realization surfaces", Service.SUMO
            )

        perf_metrics = PerfMetrics()

        async with asyncio.TaskGroup() as tg:
            queries = RealizationSurfQueries(self._sumo_client, self._case_uuid, self._iteration_name)
            static_surfs_task = tg.create_task(queries.find_surf_info_async(SurfTimeType.NO_TIME))
            time_point_surfs_task = tg.create_task(queries.find_surf_info_async(SurfTimeType.TIME_POINT))
            interval_surfs_task = tg.create_task(queries.find_surf_info_async(SurfTimeType.INTERVAL))
            time_points_task = tg.create_task(queries.find_surf_time_points_async())
            intervals_task = tg.create_task(queries.find_surf_time_intervals_async())

        perf_metrics.record_lap("queries")

        surf_meta_arr: list[SurfaceMeta] = []
        surf_meta_arr.extend(_build_surface_meta_arr(static_surfs_task.result(), SurfTimeType.NO_TIME, False))
        surf_meta_arr.extend(_build_surface_meta_arr(time_point_surfs_task.result(), SurfTimeType.TIME_POINT, False))
        surf_meta_arr.extend(_build_surface_meta_arr(interval_surfs_task.result(), SurfTimeType.INTERVAL, False))

        src_time_points: list[TimePoint] = time_points_task.result()
        time_points_iso_strings = [timepoint.t0_isostr for timepoint in src_time_points]

        src_intervals: list[TimeInterval] = intervals_task.result()
        intervals_iso_strings = [f"{interval.t0_isostr}/{interval.t1_isostr}" for interval in src_intervals]

        surf_meta_set = SurfaceMetaSet(
            surfaces=surf_meta_arr,
            time_points_iso_str=time_points_iso_strings,
            time_intervals_iso_str=intervals_iso_strings,
        )

        perf_metrics.record_lap("build-meta")

        LOGGER.debug(
            f"Got metadata for realization surfaces in: {perf_metrics.to_string()} [{len(surf_meta_arr)} entries]"
        )
        return surf_meta_set

    async def get_observed_surfaces_metadata_async(self) -> SurfaceMetaSet:
        perf_metrics = PerfMetrics()

        async with asyncio.TaskGroup() as tg:
            queries = ObservedSurfQueries(self._sumo_client, self._case_uuid)
            time_point_surfs_task = tg.create_task(queries.find_surf_info_async(SurfTimeType.TIME_POINT))
            interval_surfs_task = tg.create_task(queries.find_surf_info_async(SurfTimeType.INTERVAL))
            time_points_task = tg.create_task(queries.find_surf_time_points_async())
            intervals_task = tg.create_task(queries.find_surf_time_intervals_async())

        perf_metrics.record_lap("queries")

        surf_meta_arr: list[SurfaceMeta] = []
        surf_meta_arr.extend(_build_surface_meta_arr(time_point_surfs_task.result(), SurfTimeType.TIME_POINT, True))
        surf_meta_arr.extend(_build_surface_meta_arr(interval_surfs_task.result(), SurfTimeType.INTERVAL, True))

        src_time_points: list[TimePoint] = time_points_task.result()
        time_points_iso_strings = [timepoint.t0_isostr for timepoint in src_time_points]

        src_intervals: list[TimeInterval] = intervals_task.result()
        intervals_iso_strings = [f"{interval.t0_isostr}/{interval.t1_isostr}" for interval in src_intervals]

        surf_meta_set = SurfaceMetaSet(
            surfaces=surf_meta_arr,
            time_points_iso_str=time_points_iso_strings,
            time_intervals_iso_str=intervals_iso_strings,
        )

        perf_metrics.record_lap("build-meta")

        LOGGER.debug(
            f"Got metadata for observed surfaces in: {perf_metrics.to_string()} [{len(surf_meta_arr)} entries]"
        )

        return surf_meta_set

    @otel_span_decorator()
    async def get_realization_surface_data_async(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: str | None = None
    ) -> xtgeo.RegularSurface:
        """
        Get surface data for a realization surface
        If time_or_interval_str is None, only surfaces with no time information will be considered.
        """
        if not self._iteration_name:
            raise InvalidParameterError("Iteration name must be set to get realization surface", Service.SUMO)

        perf_metrics = PerfMetrics()

        surf_str = self._make_real_surf_log_str(real_num, name, attribute, time_or_interval_str)

        time_filter = _time_or_interval_str_to_sumo_time_filter(time_or_interval_str)
        search_context = SearchContext(self._sumo_client).surfaces.filter(
            uuid=self._case_uuid,
            is_observation=False,
            aggregation=False,
            iteration=self._iteration_name,
            realization=real_num,
            name=name,
            time=time_filter,
        )
        search_context = _filter_search_context_on_attribute(search_context, attribute)

        surf_count = await search_context.length_async()
        if surf_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple ({surf_count}) surfaces found in Sumo for: {surf_str}", Service.SUMO
            )
        if surf_count == 0:
            raise NoDataError(f"No realization surface found in Sumo for: {surf_str}", Service.SUMO)

        sumo_surf: Surface = await search_context.getitem_async(0)
        perf_metrics.record_lap("locate")

        async with start_otel_span_async("download-blob") as span:
            byte_stream: BytesIO = await sumo_surf.blob_async
            size_mb = byte_stream.getbuffer().nbytes / (1024 * 1024)
            span.set_attribute("webviz.data.size_mb", size_mb)
            perf_metrics.record_lap("download")

        with start_otel_span("xtgeo-read", {"webviz.data.size_mb": size_mb}):
            xtgeo_surf = xtgeo.surface_from_file(byte_stream)
            perf_metrics.record_lap("xtgeo-read")

        LOGGER.debug(
            f"Got realization surface from Sumo in: {perf_metrics.to_string()} "
            f"[{xtgeo_surf.ncol}x{xtgeo_surf.nrow}, {size_mb:.2f}MB] ({surf_str})"
        )

        return xtgeo_surf

    @otel_span_decorator()
    async def get_observed_surface_data_async(
        self, name: str, attribute: str, time_or_interval_str: str
    ) -> xtgeo.RegularSurface:
        """
        Get surface data for an observed surface
        """
        perf_metrics = PerfMetrics()

        surf_str = self._make_obs_surf_log_str(name, attribute, time_or_interval_str)

        time_filter = _time_or_interval_str_to_sumo_time_filter(time_or_interval_str)
        search_context = SearchContext(self._sumo_client).surfaces.filter(
            uuid=self._case_uuid,
            stage="case",
            is_observation=True,
            name=name,
            time=time_filter,
        )
        search_context = _filter_search_context_on_attribute(search_context, attribute)

        surf_count = await search_context.length_async()
        if surf_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple ({surf_count}) surfaces found in Sumo for: {surf_str}", Service.SUMO
            )
        if surf_count == 0:
            raise NoDataError(f"No observed surface found in Sumo for: {surf_str}", Service.SUMO)

        sumo_surf: Surface = await search_context.getitem_async(0)
        perf_metrics.record_lap("locate")

        byte_stream: BytesIO = await sumo_surf.blob_async
        perf_metrics.record_lap("download")

        xtgeo_surf = xtgeo.surface_from_file(byte_stream)
        perf_metrics.record_lap("xtgeo-read")

        size_mb = byte_stream.getbuffer().nbytes / (1024 * 1024)
        LOGGER.debug(
            f"Got observed surface from Sumo in: {perf_metrics.to_string()} "
            f"[{xtgeo_surf.ncol}x{xtgeo_surf.nrow}, {size_mb:.2f}MB] ({surf_str})"
        )

        return xtgeo_surf

    @otel_span_decorator()
    async def get_statistical_surface_data_async(
        self,
        statistic_function: StatisticFunction,
        name: str,
        attribute: str,
        realizations: Sequence[int] | None = None,
        time_or_interval_str: str | None = None,
    ) -> xtgeo.RegularSurface:
        """
        Compute statistic and return surface data
        If realizations is None this is interpreted as a wildcard and surfaces from all realizations will be included
        in the statistics. The list of realizations cannon be empty.
        If time_or_interval_str is None, only surfaces with no time information will be considered.
        """
        if not self._iteration_name:
            raise InvalidParameterError("Iteration name must be set to get realization surfaces", Service.SUMO)

        if realizations is not None:
            if len(realizations) == 0:
                raise InvalidParameterError("List of realizations cannot be empty", Service.SUMO)

        perf_metrics = PerfMetrics()

        surf_str = self._make_stat_surf_log_str(name, attribute, time_or_interval_str)

        time_filter = _time_or_interval_str_to_sumo_time_filter(time_or_interval_str)

        search_context = SearchContext(self._sumo_client).surfaces.filter(
            uuid=self._case_uuid,
            is_observation=False,
            aggregation=False,
            iteration=self._iteration_name,
            name=name,
            realization=realizations if realizations is not None else True,
            time=time_filter,
        )
        search_context = _filter_search_context_on_attribute(search_context, attribute)

        surf_count = await search_context.length_async()
        perf_metrics.record_lap("locate")

        if surf_count == 0:
            raise InvalidParameterError(f"No statistical source surfaces found in Sumo for: {surf_str}", Service.SUMO)
        if surf_count == 1:
            # As of now, the Sumo aggregation service does not support single realization aggregation.
            # For now throw an error. Alternatively we could fetch the single realization surface
            raise InvalidParameterError(
                f"Could not calculate statistical surface, only one source surface found for: {surf_str}", Service.SUMO
            )

        # Ensure that we got data for all the requested realizations
        realizations_found = await search_context.get_field_values_async("fmu.realization.id")
        perf_metrics.record_lap("collect-reals")
        if realizations is not None:
            missing_reals = list(set(realizations) - set(realizations_found))
            if len(missing_reals) > 0:
                raise InvalidParameterError(
                    f"Could not find source surfaces for realizations: {missing_reals} in Sumo for {surf_str}",
                    Service.SUMO,
                )

        sumo_stat_op_str = _map_to_sumo_aggregation_operation(statistic_function)
        sumo_surf_obj = await search_context.aggregate_async(operation=sumo_stat_op_str)
        xtgeo_surf = await sumo_surf_obj.to_regular_surface_async() if sumo_surf_obj else None
        perf_metrics.record_lap("calc-stat")

        if not xtgeo_surf:
            raise ServiceRequestError(
                f"Could not calculate statistical surface using Sumo for: {surf_str}", Service.SUMO
            )

        LOGGER.debug(
            f"Calculated statistical surface using Sumo in: {perf_metrics.to_string()} "
            f"[{xtgeo_surf.ncol}x{xtgeo_surf.nrow}, real count: {len(realizations_found)}] ({surf_str})"
        )

        return xtgeo_surf

    def _make_real_surf_log_str(self, real_num: int, name: str, attribute: str, date_str: str | None) -> str:
        addr_str = f"N={name}, A={attribute}, R={real_num}, D={date_str}, C={self._case_uuid}, I={self._iteration_name}"
        return addr_str

    def _make_obs_surf_log_str(self, name: str, attribute: str, date_str: str) -> str:
        addr_str = f"N={name}, A={attribute}, D={date_str}, C={self._case_uuid}"
        return addr_str

    def _make_stat_surf_log_str(self, name: str, attribute: str, date_str: str | None) -> str:
        addr_str = f"N={name}, A={attribute}, D={date_str}, C={self._case_uuid}, I={self._iteration_name}"
        return addr_str


def _filter_search_context_on_attribute(search_context: SearchContext, attribute: str) -> SearchContext:
    """Adds "attribute" filter to an existing search context. Attribute can be either a tagname or a standard result."""

    if attribute.endswith(" (standard result)"):
        standard_result = attribute.removesuffix(" (standard result)")
        return search_context.filter(
            standard_result=standard_result,
        )
    return search_context.filter(
        tagname=attribute,
    )


def _build_surface_meta_arr(
    src_surf_info_arr: list[SurfInfo], time_type: SurfTimeType, are_observations: bool
) -> list[SurfaceMeta]:
    ret_arr: list[SurfaceMeta] = []

    for info in src_surf_info_arr:
        content_str = info.content
        attribute_str: str | None = None
        if not info.tagname and not info.standard_result:
            LOGGER.warning(
                f"Surface {info.name} (content={content_str})  has empty tagname and standard_result, ignoring the surface"
            )
            continue
        if info.tagname and info.standard_result:
            LOGGER.warning(
                f"Surface {info.name} (tagname={info.tagname}, content={content_str}) has both tagname and standard_result, ignoring the surface"
            )
            continue

        if info.standard_result:
            attribute_str = f"{info.standard_result} (standard result)"

        else:
            attribute_str = info.tagname

        content_enum = SumoContent.UNKNOWN
        if not content_str:
            content_enum = SumoContent.DEPTH
            LOGGER.warning(f"Surface {info.name} (tagname={info.tagname}) has empty content, defaulting to DEPTH")
        elif content_str == "unset":
            # Remove this once Sumo enforces content (content-unset), https://github.com/equinor/webviz/issues/433
            content_enum = SumoContent.DEPTH
            LOGGER.warning(f"Surface {info.name} (tagname={info.tagname}) has unset content, defaulting to DEPTH")
        else:
            try:
                content_enum = SumoContent(content_str)
            except ValueError:
                LOGGER.warning(
                    f"Surface {info.name} (tagname={info.tagname}) has unrecognized content: {content_str}, defaulting to UNKNOWN."
                )

        ret_arr.append(
            SurfaceMeta(
                name=info.name,
                attribute_name=attribute_str,
                content=content_enum,
                time_type=time_type,
                is_observation=are_observations,
                is_stratigraphic=info.is_stratigraphic,
                global_min_val=info.global_min_val,
                global_max_val=info.global_max_val,
            )
        )

    return ret_arr


def _time_or_interval_str_to_sumo_time_filter(time_or_interval_str: str | None) -> TimeFilter:
    if time_or_interval_str is None:
        return TimeFilter(TimeType.NONE)

    timestamp_arr = time_or_interval_str.split("/", 1)
    if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
        raise ValueError("time_or_interval_str must contain a single timestamp or interval")

    if len(timestamp_arr) == 1:
        return TimeFilter(
            TimeType.TIMESTAMP,
            start=timestamp_arr[0],
            end=timestamp_arr[0],
            exact=True,
        )
    return TimeFilter(
        TimeType.INTERVAL,
        start=timestamp_arr[0],
        end=timestamp_arr[1],
        exact=True,
    )


def _map_to_sumo_aggregation_operation(statistic_function: StatisticFunction) -> str:
    sumo_agg_op = {
        StatisticFunction.MIN: "min",
        StatisticFunction.MAX: "max",
        StatisticFunction.MEAN: "mean",
        StatisticFunction.P10: "p10",
        StatisticFunction.P90: "p90",
        StatisticFunction.P50: "p50",
        StatisticFunction.STD: "std",
    }.get(statistic_function)

    if sumo_agg_op is None:
        raise ValueError(f"Unhandled statistic function: {statistic_function}")

    return sumo_agg_op
