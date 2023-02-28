import logging
from io import BytesIO
from typing import List, Optional, Tuple

import xtgeo
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection, Surface, SurfaceCollection
from pydantic import BaseModel
from sumo.wrapper import SumoClient

from ..utils.perf_timer import PerfTimer
from ..utils.statistic_function import StatisticFunction
from ._helpers import create_sumo_client_instance

LOGGER = logging.getLogger(__name__)


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    date_strings: List[str]

    @classmethod
    def create_empty(cls):
        return cls(attributes=[], names=[], date_strings=[])


class StaticSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]

    @classmethod
    def create_empty(cls):
        return cls(attributes=[], names=[])


class SurfaceAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name

    def get_dynamic_surf_dir(self) -> DynamicSurfaceDirectory:
        """
        Get a directory of surface names, attributes and date strings for simulated dynamic surfaces.
        These are the non-observed surfaces that DO have time stamps or time intervals
        """
        timer = PerfTimer()

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        timestamp_or_interval_filter = TimeFilter(TimeType.ALL)
        surface_collection: SurfaceCollection = case.surfaces.filter(
            iteration=self._iteration_name, aggregation=False, time=timestamp_or_interval_filter
        )

        names = surface_collection.names
        attributes = surface_collection.tagnames
        timestamps: List[str] = surface_collection.timestamps
        intervals: List[Tuple[str, str]] = surface_collection.intervals

        # ISO 8601 recommends '/' as separator, alternatively '--'
        # https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
        intervals_as_strings: List[str] = [f"{interval[0]}--{interval[1]}" for interval in intervals]

        date_strings: List[str] = []
        date_strings.extend(timestamps)
        date_strings.extend(intervals_as_strings)

        surf_dir = DynamicSurfaceDirectory(names=names, attributes=attributes, date_strings=date_strings)

        LOGGER.debug(f"Built dynamic surface directory in: {timer.elapsed_ms():}ms")

        return surf_dir

    def get_static_surf_dir(self) -> StaticSurfaceDirectory:
        """
        Get a directory of surface names and attributes for static surfaces.
        These are the non-observed surfaces that do NOT have time stamps
        """
        timer = PerfTimer()

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        no_time_data_filter = TimeFilter(TimeType.NONE)
        surface_collection: SurfaceCollection = case.surfaces.filter(
            iteration=self._iteration_name, aggregation=False, time=no_time_data_filter
        )

        names = surface_collection.names
        attributes = surface_collection.tagnames

        surf_dir = StaticSurfaceDirectory(names=names, attributes=attributes)

        LOGGER.debug(f"Built static surface directory in: {timer.elapsed_ms():}ms")

        return surf_dir

    def get_dynamic_surf(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: str
    ) -> Optional[xtgeo.RegularSurface]:
        """Get actual surface data for a simulated dynamic surface"""

        # All dynamic sim surfaces should have a string containing a time stamp or time interval
        if not time_or_interval_str or len(time_or_interval_str) < 1:
            raise ValueError("time_or_interval_str must contain a non-empty string")

        timestamp_arr = time_or_interval_str.split("--", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")

        timer = PerfTimer()

        addr_str = self._make_addr_str(real_num, name, attribute, time_or_interval_str)

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(TimeType.TIMESTAMP, start=timestamp_arr[0], end=timestamp_arr[0], exact=True)
        else:
            time_filter = TimeFilter(TimeType.INTERVAL, start=timestamp_arr[0], end=timestamp_arr[1], exact=True)

        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=real_num,
            name=name,
            tagname=attribute,
            time=time_filter,
        )

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No dynamic surface found in Sumo for {addr_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. returning first surface.")

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(f"Got dynamic surface from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_surf

    def get_statistical_dynamic_surf(
        self, statistic_function: StatisticFunction, name: str, attribute: str, time_or_interval_str: str
    ) -> Optional[xtgeo.RegularSurface]:

        # All dynamic sim surfaces should have a string containing a time stamp or time interval
        if not time_or_interval_str or len(time_or_interval_str) < 1:
            raise ValueError("time_or_interval_str must contain a non-empty string")

        timestamp_arr = time_or_interval_str.split("--", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")

        timer = PerfTimer()

        addr_str = self._make_addr_str(-1, name, attribute, time_or_interval_str)

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]
        et_get_case_ms = timer.lap_ms()

        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(TimeType.TIMESTAMP, start=timestamp_arr[0], end=timestamp_arr[0], exact=True)
        else:
            time_filter = TimeFilter(TimeType.INTERVAL, start=timestamp_arr[0], end=timestamp_arr[1], exact=True)

        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            name=name,
            tagname=attribute,
            time=time_filter,
        )
        et_collect_surfaces_ms = timer.lap_ms()

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No dynamic surfaces found in Sumo for {addr_str}")
            return None

        realizations = surface_collection.realizations

        xtgeo_surf: xtgeo.RegularSurface = None
        if statistic_function == StatisticFunction.MIN:
            xtgeo_surf = surface_collection.min()
        elif statistic_function == StatisticFunction.MAX:
            xtgeo_surf = surface_collection.max()
        elif statistic_function == StatisticFunction.MEAN:
            xtgeo_surf = surface_collection.mean()
        elif statistic_function == StatisticFunction.P10:
            xtgeo_surf = surface_collection.p10()
        elif statistic_function == StatisticFunction.P90:
            xtgeo_surf = surface_collection.p90()
        elif statistic_function == StatisticFunction.P50:
            xtgeo_surf = surface_collection.p50()

        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate statistic surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(f"Calculated statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"collect_surfaces={et_collect_surfaces_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )")

        return xtgeo_surf


    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._iteration_name}__C:{self._case_uuid}"
        return addr_str
