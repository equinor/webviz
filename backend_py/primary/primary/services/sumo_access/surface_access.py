import asyncio
import logging
from io import BytesIO
from typing import Sequence

import xtgeo

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects import SurfaceCollection, Surface

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.utils.statistic_function import StatisticFunction
from primary.services.service_exceptions import Service, MultipleDataMatchesError, InvalidParameterError

from ._helpers import create_sumo_client
from .surface_types import SurfaceMeta, SurfaceMetaSet
from .generic_types import SumoContent
from .queries.surface_queries import SurfTimeType, SurfInfo, TimePoint, TimeInterval
from .queries.surface_queries import RealizationSurfQueries, ObservedSurfQueries

LOGGER = logging.getLogger(__name__)


class SurfaceAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str | None):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str | None = iteration_name

    @classmethod
    def from_case_uuid(cls, access_token: str, case_uuid: str, iteration_name: str) -> "SurfaceAccess":
        sumo_client = create_sumo_client(access_token)
        return SurfaceAccess(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    @classmethod
    def from_case_uuid_no_iteration(cls, access_token: str, case_uuid: str) -> "SurfaceAccess":
        sumo_client = create_sumo_client(access_token)
        return SurfaceAccess(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=None)

    async def get_realization_surfaces_metadata_async(self) -> SurfaceMetaSet:
        if not self._iteration_name:
            raise InvalidParameterError(
                "Iteration name must be set to get metadata for realization surfaces", Service.SUMO
            )

        perf_metrics = PerfMetrics()

        async with asyncio.TaskGroup() as tg:
            queries = RealizationSurfQueries(self._sumo_client, self._case_uuid, self._iteration_name)
            static_surfs_task = tg.create_task(queries.find_surf_info(SurfTimeType.NO_TIME))
            time_point_surfs_task = tg.create_task(queries.find_surf_info(SurfTimeType.TIME_POINT))
            interval_surfs_task = tg.create_task(queries.find_surf_info(SurfTimeType.INTERVAL))
            time_points_task = tg.create_task(queries.find_surf_time_points())
            intervals_task = tg.create_task(queries.find_surf_time_intervals())

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
            time_point_surfs_task = tg.create_task(queries.find_surf_info(SurfTimeType.TIME_POINT))
            interval_surfs_task = tg.create_task(queries.find_surf_info(SurfTimeType.INTERVAL))
            time_points_task = tg.create_task(queries.find_surf_time_points())
            intervals_task = tg.create_task(queries.find_surf_time_intervals())

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

    async def get_realization_surface_data_async(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: str | None = None
    ) -> xtgeo.RegularSurface | None:
        """
        Get surface data for a realization surface
        If time_or_interval_str is None, only surfaces with no time information will be considered.
        """
        if not self._iteration_name:
            raise InvalidParameterError("Iteration name must be set to get realization surface", Service.SUMO)

        perf_metrics = PerfMetrics()

        surf_str = self._make_real_surf_log_str(real_num, name, attribute, time_or_interval_str)

        time_filter = _time_or_interval_str_to_time_filter(time_or_interval_str)

        surface_collection = SurfaceCollection(self._sumo_client, self._case_uuid).filter(
            is_observation=False,
            aggregation=False,
            iteration=self._iteration_name,
            realization=real_num,
            name=name,
            tagname=attribute,
            time=time_filter,
        )

        surf_count = await surface_collection.length_async()
        if surf_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple ({surf_count}) surfaces found in Sumo for: {surf_str}", Service.SUMO
            )
        if surf_count == 0:
            LOGGER.warning(f"No realization surface found in Sumo for: {surf_str}")
            return None

        sumo_surf: Surface = await surface_collection.getitem_async(0)
        perf_metrics.record_lap("locate")

        byte_stream: BytesIO = await sumo_surf.blob_async
        perf_metrics.record_lap("download")

        xtgeo_surf = xtgeo.surface_from_file(byte_stream)
        perf_metrics.record_lap("xtgeo-read")

        size_mb = byte_stream.getbuffer().nbytes / (1024 * 1024)
        LOGGER.debug(
            f"Got realization surface from Sumo in: {perf_metrics.to_string()} "
            f"[{xtgeo_surf.ncol}x{xtgeo_surf.nrow}, {size_mb:.2f}MB] ({surf_str})"
        )

        return xtgeo_surf

    async def get_observed_surface_data_async(
        self, name: str, attribute: str, time_or_interval_str: str
    ) -> xtgeo.RegularSurface | None:
        """
        Get surface data for an observed surface
        """
        perf_metrics = PerfMetrics()

        surf_str = self._make_obs_surf_log_str(name, attribute, time_or_interval_str)

        time_filter = _time_or_interval_str_to_time_filter(time_or_interval_str)
        surface_collection = SurfaceCollection(self._sumo_client, self._case_uuid).filter(
            stage="case",
            is_observation=True,
            name=name,
            tagname=attribute,
            time=time_filter,
        )

        surf_count = await surface_collection.length_async()
        if surf_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple ({surf_count}) surfaces found in Sumo for: {surf_str}", Service.SUMO
            )
        if surf_count == 0:
            LOGGER.warning(f"No observed surface found in Sumo for: {surf_str}")
            return None

        sumo_surf: Surface = await surface_collection.getitem_async(0)
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

    async def get_statistical_surface_data_async(
        self,
        statistic_function: StatisticFunction,
        name: str,
        attribute: str,
        realizations: Sequence[int] | None = None,
        time_or_interval_str: str | None = None,
    ) -> xtgeo.RegularSurface | None:
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

        time_filter = _time_or_interval_str_to_time_filter(time_or_interval_str)

        surface_collection = SurfaceCollection(self._sumo_client, self._case_uuid).filter(
            is_observation=False,
            aggregation=False,
            iteration=self._iteration_name,
            name=name,
            tagname=attribute,
            realization=realizations,
            time=time_filter,
        )

        surf_count = await surface_collection.length_async()
        if surf_count == 0:
            LOGGER.warning(f"No statistical source surfaces found in Sumo for: {surf_str}")
            return None
        perf_metrics.record_lap("locate")

        realizations_found = await surface_collection.realizations_async
        perf_metrics.record_lap("collect-reals")

        # Ensure that we got data for all the requested realizations
        if realizations is not None:
            missing_reals = list(set(realizations) - set(realizations_found))
            if len(missing_reals) > 0:
                raise InvalidParameterError(
                    f"Could not find source surfaces for realizations: {missing_reals} in Sumo for {surf_str}",
                    Service.SUMO,
                )

        xtgeo_surf = await _compute_statistical_surface_async(statistic_function, surface_collection)
        perf_metrics.record_lap("calc-stat")

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate statistical surface using Sumo for: {surf_str}")
            return None

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


def _build_surface_meta_arr(
    src_surf_info_arr: list[SurfInfo], time_type: SurfTimeType, are_observations: bool
) -> list[SurfaceMeta]:
    ret_arr: list[SurfaceMeta] = []

    for info in src_surf_info_arr:
        content_str = info.content

        if not info.tagname:
            LOGGER.warning(f"Surface {info.name} (content={content_str}) has empty tagname, ignoring the surface")
            continue

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
                attribute_name=info.tagname,
                content=content_enum,
                time_type=time_type,
                is_observation=are_observations,
                is_stratigraphic=info.is_stratigraphic,
                global_min_val=info.global_min_val,
                global_max_val=info.global_max_val,
            )
        )

    return ret_arr


def _time_or_interval_str_to_time_filter(time_or_interval_str: str | None) -> TimeFilter:
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


async def _compute_statistical_surface_async(
    statistic: StatisticFunction, surface_coll: SurfaceCollection
) -> xtgeo.RegularSurface:
    xtgeo_surf: xtgeo.RegularSurface = None
    if statistic == StatisticFunction.MIN:
        xtgeo_surf = await surface_coll.min_async()
    elif statistic == StatisticFunction.MAX:
        xtgeo_surf = await surface_coll.max_async()
    elif statistic == StatisticFunction.MEAN:
        xtgeo_surf = await surface_coll.mean_async()
    elif statistic == StatisticFunction.P10:
        xtgeo_surf = await surface_coll.p10_async()
    elif statistic == StatisticFunction.P90:
        xtgeo_surf = await surface_coll.p90_async()
    elif statistic == StatisticFunction.P50:
        xtgeo_surf = await surface_coll.p50_async()
    elif statistic == StatisticFunction.STD:
        xtgeo_surf = await surface_coll.std_async()
    else:
        raise ValueError("Unhandled statistic function")

    return xtgeo_surf
