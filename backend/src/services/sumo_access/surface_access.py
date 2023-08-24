import logging
from io import BytesIO
from typing import List, Optional, Tuple

import xtgeo
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import Case, CaseCollection, SurfaceCollection
from sumo.wrapper import SumoClient

from src.services.utils.perf_timer import PerfTimer
from src.services.utils.statistic_function import StatisticFunction

from ._helpers import create_sumo_client_instance
from .surface_types import DynamicSurfaceDirectory, StaticSurfaceDirectory
from .generic_types import SumoContent

LOGGER = logging.getLogger(__name__)


class SurfaceAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name
        self._sumo_case_obj: Optional[Case] = None

    def get_dynamic_surf_dir(self) -> DynamicSurfaceDirectory:
        """
        Get a directory of surface names, attributes and date strings for simulated dynamic surfaces.
        These are the non-observed surfaces that DO have time stamps or time intervals
        """
        timer = PerfTimer()

        LOGGER.debug("Getting data for dynamic surface directory...")

        case = self._get_my_sumo_case_obj()

        filter_with_timestamp_or_interval = TimeFilter(TimeType.ALL)
        surface_collection: SurfaceCollection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            time=filter_with_timestamp_or_interval,
        )

        names = sorted(surface_collection.names)
        attributes = sorted(surface_collection.tagnames)
        timestamps: List[str] = surface_collection.timestamps
        intervals: List[Tuple[str, str]] = surface_collection.intervals
        available_contents = list(set(surf["data"]["content"] for surf in surface_collection))

        LOGGER.debug(f"available surface contents: {available_contents}")

        # ISO 8601 recommends '/' as separator, alternatively '--'
        # https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
        intervals_as_strings: List[str] = [f"{interval[0]}--{interval[1]}" for interval in intervals]

        date_strings: List[str] = []
        date_strings.extend(timestamps)
        date_strings.extend(intervals_as_strings)

        surf_dir = DynamicSurfaceDirectory(names=names, attributes=attributes, date_strings=date_strings)

        LOGGER.debug(f"Downloaded and built dynamic surface directory in: {timer.elapsed_ms():}ms")

        return surf_dir

    def get_static_surf_dir(self, content_filter: Optional[List[SumoContent]] = None) -> StaticSurfaceDirectory:
        """
        Get a directory of surface names and attributes for static surfaces.
        These are the non-observed surfaces that do NOT have time stamps
        """
        timer = PerfTimer()

        LOGGER.debug("Getting data for static surface directory...")

        case = self._get_my_sumo_case_obj()

        filter_no_time_data = TimeFilter(TimeType.NONE)
        surface_collection: SurfaceCollection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            time=filter_no_time_data,
            realization=0,
        )

        names = sorted(surface_collection.names)
        attributes = sorted(surface_collection.tagnames)
        available_contents = list(set(surf["data"]["content"] for surf in surface_collection))

        LOGGER.debug(f"available surface contents: {available_contents}")

        if content_filter is not None:
            if not any(SumoContent.has(content) for content in content_filter):
                raise ValueError(f"Invalid content filter: {content_filter}")
            surfaces_with_filtered_content = [
                surf for surf in surface_collection if surf["data"]["content"] in content_filter
            ]

            names = sorted(list(set(surf.name for surf in surfaces_with_filtered_content)))
            attributes = sorted(list(set(surf.tagname for surf in surfaces_with_filtered_content)))

        else:
            names = sorted(surface_collection.names)
            attributes = sorted(surface_collection.tagnames)

        LOGGER.debug(
            f"Build valid name/attribute combinations for static surface directory "
            f"(num names={len(names)}, num attributes={len(attributes)})..."
        )

        valid_attributes_for_name: List[List[int]] = []

        for name in names:
            filtered_coll = surface_collection.filter(name=name)
            filtered_attributes = [tagname for tagname in filtered_coll.tagnames if tagname in attributes]
            attribute_indices: List[int] = []
            for attr in filtered_attributes:
                attr_idx = attributes.index(attr)
                attribute_indices.append(attr_idx)

            valid_attributes_for_name.append(attribute_indices)

        surf_dir = StaticSurfaceDirectory(
            names=names,
            attributes=attributes,
            valid_attributes_for_name=valid_attributes_for_name,
        )

        LOGGER.debug(f"Downloaded and built static surface directory in: {timer.elapsed_ms():}ms")

        return surf_dir

    def get_dynamic_surf(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: str
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Get actual surface data for a simulated dynamic surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, time_or_interval_str)

        # Must be either a string containing a time stamp or a time interval
        if not time_or_interval_str or len(time_or_interval_str) < 1:
            raise ValueError("time_or_interval_str must contain a non-empty string")

        timestamp_arr = time_or_interval_str.split("--", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")

        case = self._get_my_sumo_case_obj()

        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )

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
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. Returning first surface.")

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(f"Got dynamic surface from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_surf

    def get_statistical_dynamic_surf(
        self,
        statistic_function: StatisticFunction,
        name: str,
        attribute: str,
        time_or_interval_str: str,
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Compute statistic and return surface data for a dynamic surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(-1, name, attribute, time_or_interval_str)

        # Must be either a string containing a time stamp or a time interval
        if not time_or_interval_str or len(time_or_interval_str) < 1:
            raise ValueError("time_or_interval_str must contain a non-empty string")

        timestamp_arr = time_or_interval_str.split("--", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")

        case = self._get_my_sumo_case_obj()
        et_get_case_ms = timer.lap_ms()

        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )

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

        xtgeo_surf = _compute_statistical_surface(statistic_function, surface_collection)
        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate dynamic statistical surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(
            f"Calculated dynamic statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"collect_surfaces={et_collect_surfaces_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )"
        )

        return xtgeo_surf

    def get_static_surf(self, real_num: int, name: str, attribute: str) -> Optional[xtgeo.RegularSurface]:
        """
        Get actual surface data for a static surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, None)

        case = self._get_my_sumo_case_obj()

        filter_no_time_data = TimeFilter(TimeType.NONE)
        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=real_num,
            name=name,
            tagname=attribute,
            time=filter_no_time_data,
        )

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No static surface found in Sumo for {addr_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. Returning first surface.")

        sumo_surf = surface_collection[0]
        byte_stream: BytesIO = sumo_surf.blob
        xtgeo_surf = xtgeo.surface_from_file(byte_stream)

        LOGGER.debug(f"Got static surface from Sumo in: {timer.elapsed_ms()}ms ({addr_str})")

        return xtgeo_surf

    def get_statistical_static_surf(
        self, statistic_function: StatisticFunction, name: str, attribute: str
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Compute statistic and return surface data for a static surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(-1, name, attribute, None)

        case = self._get_my_sumo_case_obj()
        et_get_case_ms = timer.lap_ms()

        filter_no_time_data = TimeFilter(TimeType.NONE)
        surface_collection = case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            name=name,
            tagname=attribute,
            time=filter_no_time_data,
        )
        et_collect_surfaces_ms = timer.lap_ms()

        surf_count = len(surface_collection)
        if surf_count == 0:
            LOGGER.warning(f"No static surfaces found in Sumo for {addr_str}")
            return None

        realizations = surface_collection.realizations

        xtgeo_surf = _compute_statistical_surface(statistic_function, surface_collection)
        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate static statistical surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(
            f"Calculated static statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"collect_surfaces={et_collect_surfaces_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )"
        )

        return xtgeo_surf

    def _get_my_sumo_case_obj(self) -> Case:
        """
        Get the Sumo case that we should be working on.
        Raises exception if case isn't found
        """
        if self._sumo_case_obj is None:
            case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
            if len(case_collection) != 1:
                raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

            self._sumo_case_obj = case_collection[0]

        return self._sumo_case_obj

    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._iteration_name}__C:{self._case_uuid}"
        return addr_str


def _compute_statistical_surface(statistic: StatisticFunction, surface_coll: SurfaceCollection) -> xtgeo.RegularSurface:
    xtgeo_surf: xtgeo.RegularSurface = None
    if statistic == StatisticFunction.MIN:
        xtgeo_surf = surface_coll.min()
    elif statistic == StatisticFunction.MAX:
        xtgeo_surf = surface_coll.max()
    elif statistic == StatisticFunction.MEAN:
        xtgeo_surf = surface_coll.mean()
    elif statistic == StatisticFunction.P10:
        xtgeo_surf = surface_coll.p10()
    elif statistic == StatisticFunction.P90:
        xtgeo_surf = surface_coll.p90()
    elif statistic == StatisticFunction.P50:
        xtgeo_surf = surface_coll.p50()
    elif statistic == StatisticFunction.STD:
        xtgeo_surf = surface_coll.std()
    else:
        raise ValueError("Unhandled statistic function")

    return xtgeo_surf
