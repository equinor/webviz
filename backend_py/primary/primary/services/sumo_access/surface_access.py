import logging
from io import BytesIO
from typing import List, Optional

import xtgeo
import numpy as np

from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects import SurfaceCollection, Surface

from webviz_pkg.core_utils.perf_timer import PerfTimer
from primary.services.utils.statistic_function import StatisticFunction

from ._helpers import SumoEnsemble
from .surface_types import SurfaceMeta, XtgeoSurfaceIntersectionResult, XtgeoSurfaceIntersectionPolyline
from .generic_types import SumoContent


LOGGER = logging.getLogger(__name__)


class SurfaceAccess(SumoEnsemble):
    async def get_surface_directory_async(self) -> List[SurfaceMeta]:
        surface_collection: SurfaceCollection = self._case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=self._case.get_realizations(iteration=self._iteration_name)[0],
        )

        surfs: List[SurfaceMeta] = []
        async for surf in surface_collection:
            iso_string_or_time_interval = None

            t_start = surf["data"].get("time", {}).get("t0", {}).get("value", None)
            t_end = surf["data"].get("time", {}).get("t1", {}).get("value", None)
            if t_start and not t_end:
                iso_string_or_time_interval = t_start
            if t_start and t_end:
                iso_string_or_time_interval = f"{t_start}/{t_end}"
            content = surf["data"].get("content", SumoContent.DEPTH)

            # Remove this once Sumo enforces content (content-unset)
            # https://github.com/equinor/webviz/issues/433

            if content == "unset":
                LOGGER.info(
                    f"Surface {surf['data']['name']} has unset content. Defaulting temporarily to depth until enforced by dataio."
                )
                content = SumoContent.DEPTH

            # Remove this once Sumo enforces tagname (tagname-unset)
            # https://github.com/equinor/webviz/issues/433
            tagname = surf["data"].get("tagname", "")
            if tagname == "":
                LOGGER.info(
                    f"Surface {surf['data']['name']} has empty tagname. Defaulting temporarily to Unknown until enforced by dataio."
                )
                tagname = "Unknown"
            surf_meta = SurfaceMeta(
                name=surf["data"]["name"],
                tagname=tagname,
                iso_date_or_interval=iso_string_or_time_interval,
                content=content,
                is_observation=surf["data"]["is_observation"],
                is_stratigraphic=surf["data"]["stratigraphic"],
                zmin=surf["data"]["bbox"]["zmin"],
                zmax=surf["data"]["bbox"]["zmax"],
            )

            surfs.append(surf_meta)

        return surfs

    async def get_realization_surface_intersection_async(
        self,
        real_num: int,
        name: str,
        attribute: str,
        polyline: XtgeoSurfaceIntersectionPolyline,
        time_or_interval_str: Optional[str] = None,
    ) -> xtgeo.RegularSurface:
        """
        Get intersection of realization surface for requested surface name
        """
        surface = await self.get_realization_surface_data_async(
            real_num=real_num, name=name, attribute=attribute, time_or_interval_str=time_or_interval_str
        )

        if surface is None:
            raise ValueError(f'Surface "{name}" not found in sumo')

        # Ensure name is applied
        surface.name = name

        # The input fencespec is a 2D numpy where each row is X, Y, Z, HLEN,
        # where X, Y are UTM coordinates, Z is depth/time, and HLEN is a
        # length along the fence.
        xtgeo_fencespec = np.array([polyline.X, polyline.Y, polyline.Z, polyline.HLEN]).T

        return _make_intersection(surface, xtgeo_fencespec)

    async def get_realization_surface_data_async(
        self, real_num: int, name: str, attribute: str, time_or_interval_str: Optional[str] = None
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Get surface data for a realization surface
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(real_num, name, attribute, time_or_interval_str)

        if time_or_interval_str is None:
            time_filter = TimeFilter(TimeType.NONE)

        else:
            timestamp_arr = time_or_interval_str.split("/", 1)
            if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
                raise ValueError("time_or_interval_str must contain a single timestamp or interval")
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
        # Remove this once Sumo enforces tagname (tagname-unset)
        # https://github.com/equinor/webviz/issues/433
        tagname = attribute if attribute != "Unknown" else ""
        surface_collection = self._case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=real_num,
            name=name,
            tagname=tagname,
            time=time_filter,
        )

        surf_count = await surface_collection.length_async()
        if surf_count == 0:
            LOGGER.warning(f"No realization surface found in Sumo for {addr_str}")
            return None
        if surf_count > 1:
            LOGGER.warning(f"Multiple ({surf_count}) surfaces found in Sumo for: {addr_str}. Returning first surface.")

        sumo_surf: Surface = await surface_collection.getitem_async(0)
        et_locate_ms = timer.lap_ms()

        byte_stream: BytesIO = await sumo_surf.blob_async
        et_download_ms = timer.lap_ms()

        xtgeo_surf = xtgeo.surface_from_file(byte_stream)
        et_xtgeo_read_ms = timer.lap_ms()

        size_mb = byte_stream.getbuffer().nbytes / (1024 * 1024)
        LOGGER.debug(
            f"Got realization surface from Sumo in: {timer.elapsed_ms()}ms ("
            f"locate={et_locate_ms}ms, "
            f"download={et_download_ms}ms, "
            f"xtgeo_read={et_xtgeo_read_ms}ms) "
            f"[{xtgeo_surf.ncol}x{xtgeo_surf.nrow}, {size_mb:.2f}MB] "
            f"({addr_str})"
        )

        return xtgeo_surf

    async def get_statistical_surface_data_async(
        self,
        statistic_function: StatisticFunction,
        name: str,
        attribute: str,
        time_or_interval_str: Optional[str] = None,
    ) -> Optional[xtgeo.RegularSurface]:
        """
        Compute statistic and return surface data
        """
        timer = PerfTimer()
        addr_str = self._make_addr_str(-1, name, attribute, time_or_interval_str)

        if time_or_interval_str is None:
            time_filter = TimeFilter(TimeType.NONE)

        else:
            timestamp_arr = time_or_interval_str.split("/", 1)
            if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
                raise ValueError("time_or_interval_str must contain a single timestamp or interval")
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

        surface_collection = self._case.surfaces.filter(
            iteration=self._iteration_name,
            aggregation=False,
            name=name,
            tagname=attribute,
            time=time_filter,
        )

        surf_count = await surface_collection.length_async()
        if surf_count == 0:
            LOGGER.warning(f"No statistical surfaces found in Sumo for {addr_str}")
            return None
        et_locate_ms = timer.lap_ms()

        realizations = await surface_collection.realizations_async
        et_collect_reals_ms = timer.lap_ms()

        xtgeo_surf = await _compute_statistical_surface_async(statistic_function, surface_collection)
        et_calc_stat_ms = timer.lap_ms()

        if not xtgeo_surf:
            LOGGER.warning(f"Could not calculate statistical surface using Sumo for {addr_str}")
            return None

        LOGGER.debug(
            f"Calculated statistical surface using Sumo in: {timer.elapsed_ms()}ms ("
            f"locate={et_locate_ms}ms, "
            f"collect_reals={et_collect_reals_ms}ms, "
            f"calc_stat={et_calc_stat_ms}ms) "
            f"({addr_str} {len(realizations)=} )"
        )

        return xtgeo_surf

    def _make_addr_str(self, real_num: int, name: str, attribute: str, date_str: Optional[str]) -> str:
        addr_str = f"R:{real_num}__N:{name}__A:{attribute}__D:{date_str}__I:{self._iteration_name}__C:{self._case_uuid}"
        return addr_str


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


def _make_intersection(surface: xtgeo.RegularSurface, xtgeo_fencespec: np.ndarray) -> XtgeoSurfaceIntersectionResult:
    line = surface.get_randomline(xtgeo_fencespec)
    intersection = XtgeoSurfaceIntersectionResult(
        name=f"{surface.name}",
        distance=line[:, 0].tolist(),
        zval=line[:, 1].tolist(),
    )
    return intersection
