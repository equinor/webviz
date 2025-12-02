from dataclasses import dataclass
import logging
from typing import Literal

import numpy as np
import xtgeo
from xtgeo import _cxtgeo
from xtgeo.common.constants import UNDEF_LIMIT
from fastapi import HTTPException

from webviz_services.sumo_access.surface_access import SurfaceAccess
from webviz_services.utils.statistic_function import StatisticFunction

from primary.utils.response_perf_metrics import ResponsePerfMetrics

from .schemas import FormationSegment, SurfaceWellPick, PickDirection, WellTrajectory, WellTrajectoryFormationSegments

from .surface_address import RealizationSurfaceAddress, ObservedSurfaceAddress, StatisticalSurfaceAddress
from .surface_address import decode_surf_addr_str

LOGGER = logging.getLogger(__name__)


def get_surface_picks_from_xtgeo(
    surf: xtgeo.RegularSurface,
    unique_wellbore_identifier: str,
    xvalues: list[float],
    yvalues: list[float],
    zvalues: list[float],
    mdvalues: list[float],
) -> list[SurfaceWellPick] | None:
    """Calculate surface/well intersections (wellpicks).
    Uses the underlying xtgeo C-extension directly for performance."""

    xarray = np.array(xvalues, dtype=np.float32)
    yarray = np.array(yvalues, dtype=np.float32)
    zarray = np.array(zvalues, dtype=np.float32)
    mdarray = np.array(mdvalues, dtype=np.float32)

    # nval = number of valid picks
    # xres, yres, zres = arrays of x,y,z coordinates of picks
    # mres = array of measured depth values of picks
    # dres = array of direction indicators of picks (1=downward, 0=upward)
    nval, xres, yres, zres, mres, dres = _cxtgeo.well_surf_picks(
        xarray,
        yarray,
        zarray,
        mdarray,
        surf.ncol,
        surf.nrow,
        surf.xori,
        surf.yori,
        surf.xinc,
        surf.yinc,
        surf.yflip,
        surf.rotation,
        surf.npvalues1d,
        xarray.size,
        yarray.size,
        zarray.size,
        mdarray.size,
        mdarray.size,
    )
    if nval < 1:
        return None

    mres[mres > UNDEF_LIMIT] = np.nan

    res: list[SurfaceWellPick] = []
    for i in range(nval):
        res.append(
            SurfaceWellPick(
                unique_wellbore_identifier=unique_wellbore_identifier,
                x=xres[i],
                y=yres[i],
                z=zres[i],
                md=mres[i],
                direction=PickDirection.DOWNWARD if dres[i] == 1 else PickDirection.UPWARD,
            )
        )
    return res


# TODO: Only accept real surfaces?
async def get_xtgeo_surface_from_sumo_async(
    access_token: str,
    surf_addr_str: str,
    perf_metrics: ResponsePerfMetrics,
) -> xtgeo.RegularSurface:
    """
    Retrieve an xtgeo RegularSurface from SUMO based on the provided surface address string.
    """

    addr = decode_surf_addr_str(surf_addr_str)
    if not isinstance(addr, RealizationSurfaceAddress | ObservedSurfaceAddress | StatisticalSurfaceAddress):
        raise HTTPException(status_code=404, detail="Endpoint only supports address types REAL, OBS and STAT")

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
    LOGGER.info(f"Got {addr.address_type} surface in: {perf_metrics.to_string()}")

    return xtgeo_surf


@dataclass
class CategorizedPick:
    """Helper dataclass to associate a pick with its surface type."""

    pick: SurfaceWellPick
    surface_type: Literal["top", "bottom"]


def create_well_trajectory_formation_segments(
    well_trajectory: WellTrajectory,
    top_surface: xtgeo.RegularSurface,
    bottom_surface: xtgeo.RegularSurface | None = None,
    surface_collapse_tolerance: float = 0.01,
) -> WellTrajectoryFormationSegments:
    """
    Create formation segments for a well trajectory based on top and optional bottom surface.

    **Description:**
    - The formation is defined by a top surface and an optional bottom surface. If bottom surface
      is not provided, the formation is considered to extend to the end of the well trajectory.

    - Each segment is defined by the measured depth (md) values where the well enters and exits
      the formation. If a well starts or ends inside the formation, the corresponding md value is
      taken from the start or end of the well trajectory, respectively.

    - The function calculates well picks for the top and bottom surfaces using xtgeo, and then
      create formation segments based on these picks and the well trajectory. The well picks
      represent the intersection points of the well trajectory with provided surfaces, and
      determines the segments of the well trajectory that lie within the formation defined by
      these surfaces.

    Args:
        well_trajectory (WellTrajectory): The well trajectory containing x, y, z, and md values.
        top_surface (xtgeo.RegularSurface): The top bounding surface of the formation.
        bottom_surface (xtgeo.RegularSurface): The optional bottom bounding surface of the
                                               formation.
    Returns:
        WellTrajectoryFormationSegments: The segments where the well trajectory is within the
                                         formation. With measured depth values at entry and exit.
    """

    # Compare topology of top and bottom surfaces (only if both surfaces are provided)
    if bottom_surface is not None:
        if top_surface.compare_topology(bottom_surface) is False:
            message = f"Top and bottom surfaces have different topology. Cannot compute formation segments for well {well_trajectory.uwi}."
            LOGGER.warning(message)
            raise HTTPException(status_code=500, detail=message)  # TODO: Service exception?

        # With equal topology, we can do a quick check to see if surfaces are interleaved
        # or if top is actually above bottom
        top_z_value = top_surface.get_values1d()
        bottom_z_value = bottom_surface.get_values1d()
        diff = bottom_z_value - top_z_value
        if np.any(diff < -abs(surface_collapse_tolerance)):
            message = (
                f"Surface depth validation failed when computing formation segments for well {well_trajectory.uwi}: "
                f"computed depth difference is below the collapse tolerance ({surface_collapse_tolerance}). "
                "This suggests interleaved surfaces or a top surface located below the bottom. "
                "Review the surface inputs."
            )
            LOGGER.warning(message)
            raise HTTPException(status_code=500, detail=message)

    top_picks = get_surface_picks_from_xtgeo(
        surf=top_surface,
        unique_wellbore_identifier=well_trajectory.uwi,
        xvalues=well_trajectory.x_points,
        yvalues=well_trajectory.y_points,
        zvalues=well_trajectory.z_points,
        mdvalues=well_trajectory.md_points,
    )

    bottom_picks: list[SurfaceWellPick] | None = []
    if bottom_surface is not None:
        bottom_picks = get_surface_picks_from_xtgeo(
            surf=bottom_surface,
            unique_wellbore_identifier=well_trajectory.uwi,
            xvalues=well_trajectory.x_points,
            yvalues=well_trajectory.y_points,
            zvalues=well_trajectory.z_points,
            mdvalues=well_trajectory.md_points,
        )

    if not top_picks:
        # TODO: Raise error instead?
        return WellTrajectoryFormationSegments(unique_wellbore_identifier=well_trajectory.uwi, formation_segments=[])

    return WellTrajectoryFormationSegments(
        unique_wellbore_identifier=well_trajectory.uwi,
        formation_segments=_create_formation_segments_from_well_trajectory_and_picks(
            well_trajectory=well_trajectory,
            top_surface_picks=top_picks,
            bottom_surface_picks=bottom_picks,
        ),
    )


def _create_formation_segments_from_well_trajectory_and_picks(
    well_trajectory: WellTrajectory,
    top_surface_picks: list[SurfaceWellPick],
    bottom_surface_picks: list[SurfaceWellPick] | None = None,
) -> list[FormationSegment]:
    """
    Create formation segments for provided surface well picks and well trajectory.

    This function assumes that the provided picks are already handled to only include those
    relevant for the formation of interest and provided well trajectory (i.e., well picks
    from top and bottom surfaces).

    **Description:**
    - The formation is defined by a top surface and an optional bottom surface.

    - The segments are created based on the provided top and bottom surface picks. If bottom surface
      picks are not provided, the formation is considered to extend to the end of the well
      trajectory.

    - Each segment is defined by the measured depth (md) values where the well enters and exits
      the formation. If a well starts or ends inside the formation, the corresponding md value is
      taken from the start or end of the well trajectory, respectively.

    - The function calculates well picks for a surface using xtgeo, i.e. intersection points of
      the well trajectory with provided surface, and determines the segments of the well trajectory
      that lie within the formation defined by these surfaces.

    - If outside the formation, the next crossing should be a segment entry into the formation by
      top pick downward or bottom pick upward.

    - If inside the formation, the next crossing should be a segment exit from the formation by top
      pick upward or bottom pick downward.

    The function uses pick directions and measured depths to correctly handle:
    - Wells entering from above (through top) or below (through bottom)
    - Wells starting inside the formation
    - Wells crossing the same surface multiple times (e.g., horizontal wells through folded
      formations)
    - Unexpected pick sequences are logged as warnings:
        - Consecutive entry picks without an exit
        - Consecutive exit picks without a prior entry

    Args:
        well_trajectory (WellTrajectory): The well trajectory containing x, y, z, and md values.
        top_surface_picks (list[SurfaceWellPick]): The top surface well picks relevant for the
                                                   formation.
        bottom_surface_picks (list[SurfaceWellPick]): The optional bottom surface well picks relevant
                                                      for the formation.
    Returns:
        WellTrajectoryFormationSegments: The segments where the well trajectory is within the formation.
                                         With measured depth values at entry and exit.
    """

    # Combine and categorize picks
    categorized_picks: list[CategorizedPick] = []
    if top_surface_picks:
        categorized_picks.extend(CategorizedPick(pick=pick, surface_type="top") for pick in top_surface_picks)
    if bottom_surface_picks:
        categorized_picks.extend(CategorizedPick(pick=pick, surface_type="bottom") for pick in bottom_surface_picks)

    if not categorized_picks:
        # TODO: Raise error instead?
        return []

    # Sort picks by measured depth
    categorized_picks.sort(key=lambda pt: pt.pick.md if pt.pick.md is not None else float("inf"))

    formation_segments = []
    md_enter = None

    # Handle if well starts inside formation based on first pick
    # Well started inside if:
    # - Exit up: top + upward
    # - Exit down: bottom + downward
    (first_pick, first_surface_type) = (categorized_picks[0].pick, categorized_picks[0].surface_type)
    is_exiting_up = first_surface_type == "top" and first_pick.direction == PickDirection.UPWARD
    is_exiting_down = first_surface_type == "bottom" and first_pick.direction == PickDirection.DOWNWARD
    if is_exiting_up or is_exiting_down:
        md_enter = well_trajectory.md_points[0]

    # Build formation segments based on picks
    for elm in categorized_picks:
        pick = elm.pick
        surface_type = elm.surface_type

        # Determine if this pick represents entering or exiting the formation
        is_entering = False
        is_exiting = False

        if surface_type == "top":
            # Top pick with DOWNWARD = entering formation (from above)
            # Top pick with UPWARD = exiting formation (to above)
            is_entering = pick.direction == PickDirection.DOWNWARD
            is_exiting = pick.direction == PickDirection.UPWARD
        else:  # bottom
            # Bottom pick with UPWARD = entering formation (from below)
            # Bottom pick with DOWNWARD = exiting formation (to below)
            is_entering = pick.direction == PickDirection.UPWARD
            is_exiting = pick.direction == PickDirection.DOWNWARD

        if is_entering:
            if md_enter is not None:
                # This shouldn't happen - two consecutive entries without an exit
                message = (
                    f"Unexpected consecutive entry picks for well {well_trajectory.uwi} at MD {pick.md}. "
                    "This may indicate data quality issues with the surface picks."
                )
                LOGGER.warning(message)
                raise HTTPException(status_code=500, detail=message)
            md_enter = pick.md
        elif is_exiting:
            if md_enter is None:
                # This shouldn't happen - exit without entry (unless we handled it as first pick)
                message = (
                    f"Unexpected exit pick without entry for well {well_trajectory.uwi} at MD {pick.md}. "
                    "This may indicate data quality issues with the surface picks."
                )
                LOGGER.warning(message)
                raise HTTPException(status_code=500, detail=message)
            else:
                formation_segments.append(FormationSegment(md_enter=md_enter, md_exit=pick.md))
                md_enter = None

    # If md_enter is still set, well ends inside formation
    if md_enter is not None:
        formation_segments.append(FormationSegment(md_enter=md_enter, md_exit=well_trajectory.md_points[-1]))

    return formation_segments
