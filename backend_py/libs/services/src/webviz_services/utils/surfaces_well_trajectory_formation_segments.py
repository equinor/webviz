from dataclasses import dataclass
import logging
from typing import Literal

import numpy as np
import xtgeo


from webviz_services.service_exceptions import InvalidDataError, InvalidParameterError, Service

from .surface_helpers import (
    get_surface_picks_for_well_trajectory_from_xtgeo,
    PickDirection,
    SurfaceWellPick,
    WellTrajectory,
)


LOGGER = logging.getLogger(__name__)


@dataclass
class CategorizedPick:
    """Helper dataclass to associate a pick with its surface type."""

    pick: SurfaceWellPick
    surface_type: Literal["top", "bottom"]


@dataclass
class FormationSegment:
    """
    Segment of a formation defined by top and bottom surface.

    The formation segment is defined by the md (measured depth) value along the well trajectory,
    at enter and exit of the formation.
    """

    md_enter: float
    md_exit: float


def validate_depth_surfaces_for_formation_segments(
    top_depth_surface: xtgeo.RegularSurface,
    bottom_depth_surface: xtgeo.RegularSurface,
    surface_collapse_tolerance: float = 0.01,
) -> None:
    """
    Validate that the provided depth surfaces are suitable for computing formation segments.

    Checks performed:
    - If both surfaces are provided, their topology must match.
    - If both surfaces are provided, the top surface should be above the bottom surface within a specified tolerance.

    Args:
        top_depth_surface (xtgeo.RegularSurface): The top bounding depth surface of the formation.
        bottom_depth_surface (xtgeo.RegularSurface): The optional bottom bounding depth surface of the formation.
        surface_collapse_tolerance (float): Tolerance to determine if surfaces are effectively at the same depth or interleaved.
    Raises:
        InvalidParameterError: If validation fails due to topology mismatch or depth issues.
    """

    # Compare topology of top and bottom surfaces (only if both surfaces are provided)
    if top_depth_surface.compare_topology(bottom_depth_surface) is False:
        message = "Top and bottom surfaces have different topology. Cannot compute formation segments."
        LOGGER.warning(message)
        raise InvalidParameterError(message, Service.GENERAL)

    # With equal topology, we can do a quick check to see if surfaces are interleaved
    # or if top is actually above bottom
    top_z_value = top_depth_surface.get_values1d()
    bottom_z_value = bottom_depth_surface.get_values1d()
    diff = bottom_z_value - top_z_value
    if np.any(diff < -abs(surface_collapse_tolerance)):
        message = (
            f"Surface depth validation failed: computed depth difference is below the collapse tolerance ({surface_collapse_tolerance}). "
            "This suggests interleaved surfaces or a top surface located below the bottom. "
            "Review the surface inputs."
        )
        LOGGER.warning(message)
        raise InvalidParameterError(message, Service.GENERAL)


def create_well_trajectory_formation_segments(
    well_trajectory: WellTrajectory,
    top_depth_surface: xtgeo.RegularSurface,
    bottom_depth_surface: xtgeo.RegularSurface | None = None,
    skip_depth_surfaces_validation: bool = False,
    surface_collapse_tolerance: float = 0.01,
) -> list[FormationSegment]:
    """
    Create formation segments for a well trajectory based on top and optional bottom surface.

    Segments of a well trajectory that intersects a formation defined by top and bottom surfaces.
    A well can enter and exit a formation multiple times, resulting in multiple segments.

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
        top_depth_surface (xtgeo.RegularSurface): The top bounding depth surface of the formation.
        bottom_depth_surface (xtgeo.RegularSurface): The optional bottom bounding depth surface of
                                                     the formation.
        skip_depth_surfaces_validation (bool): Flag to skip depth surface validation. If False,
                                               validation is performed.
        surface_collapse_tolerance (float): Tolerance for considering top and bottom surfaces to be
                                            "collapsed" (i.e. formation is too thin) - if validation
                                            is performed. Unit is in the same unit as the depth
                                            values on the surfaces, typically meters.
    Returns:
        list[FormationSegment]: The segments where the well trajectory is within the
                                formation. With measured depth values at entry and exit.
    """

    # Run depth surface validation if flag is set False, otherwise it is assumed that the caller has
    # already validated the surfaces or that validation is not needed
    if not skip_depth_surfaces_validation and bottom_depth_surface is not None:
        validate_depth_surfaces_for_formation_segments(
            top_depth_surface=top_depth_surface,
            bottom_depth_surface=bottom_depth_surface,
            surface_collapse_tolerance=surface_collapse_tolerance,
        )

    top_picks = get_surface_picks_for_well_trajectory_from_xtgeo(
        surf=top_depth_surface,
        well_trajectory=well_trajectory,
    )

    bottom_picks: list[SurfaceWellPick] | None = []
    if bottom_depth_surface is not None:
        bottom_picks = get_surface_picks_for_well_trajectory_from_xtgeo(
            surf=bottom_depth_surface,
            well_trajectory=well_trajectory,
        )

    # Allowed with empty bottom picks
    if not top_picks:
        return []

    return _create_formation_segments_from_well_trajectory_and_picks(
        well_trajectory=well_trajectory,
        top_surface_picks=top_picks,
        bottom_surface_picks=bottom_picks,
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
        list[FormationSegment]: The segments where the well trajectory is within the formation.
                                With measured depth values at entry and exit.
    """

    # Combine and categorize picks
    categorized_picks: list[CategorizedPick] = []
    if top_surface_picks:
        categorized_picks.extend(CategorizedPick(pick=pick, surface_type="top") for pick in top_surface_picks)
    if bottom_surface_picks:
        categorized_picks.extend(CategorizedPick(pick=pick, surface_type="bottom") for pick in bottom_surface_picks)

    if not categorized_picks:
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
                    f"Unexpected consecutive entry picks for well {well_trajectory.unique_wellbore_identifier} at MD {pick.md}. "
                    "This may indicate data quality issues with the surface picks."
                )
                LOGGER.warning(message)
                raise InvalidDataError(message, Service.GENERAL)

            md_enter = pick.md
        elif is_exiting:
            if md_enter is None:
                # This shouldn't happen - exit without entry (unless we handled it as first pick)
                message = (
                    f"Unexpected exit pick without entry for well {well_trajectory.unique_wellbore_identifier} at MD {pick.md}. "
                    "This may indicate data quality issues with the surface picks."
                )
                LOGGER.warning(message)
                raise InvalidDataError(message, Service.GENERAL)

            formation_segments.append(FormationSegment(md_enter=md_enter, md_exit=pick.md))
            md_enter = None

    # If md_enter is still set, well ends inside formation
    if md_enter is not None:
        formation_segments.append(FormationSegment(md_enter=md_enter, md_exit=well_trajectory.md_points[-1]))

    return formation_segments
