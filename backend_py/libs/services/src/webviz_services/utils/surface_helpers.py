from dataclasses import dataclass
from enum import StrEnum

import numpy as np
import xtgeo
from xtgeo import _cxtgeo
from xtgeo.common.constants import UNDEF_LIMIT

from numpy.typing import NDArray

from webviz_services.service_exceptions import InvalidParameterError, Service


def surface_to_float32_numpy_array(surface: xtgeo.RegularSurface) -> NDArray[np.float32]:
    masked_values = surface.values.astype(np.float32)
    values = np.ma.filled(masked_values, fill_value=np.nan)

    # Rotate 90 deg left.
    # This will cause the width of to run along the X axis
    # and height of along Y axis (starting from bottom.)
    values = np.rot90(values)

    return values.flatten()


def are_all_surface_values_undefined(surface: xtgeo.RegularSurface) -> bool:
    """
    Helper to check if all property values in the surface are undefined (masked)
    """
    # Note that the values array is a 2d masked array
    if surface.values.mask.all():
        return True

    return False


@dataclass(frozen=True)
class MinMax:
    min: float
    max: float


def get_min_max_surface_values(surface: xtgeo.RegularSurface) -> MinMax | None:
    """
    Helper function to get the min/max property values of an xtgeo surface
    Ensures that masked values don't leak out in cases where all property values are masked
    """
    # Note that the values array is a 2d masked array
    surf_values_ma: np.ma.MaskedArray = surface.values

    masked_min_val = surf_values_ma.min()
    masked_max_val = surf_values_ma.max()
    if masked_min_val is np.ma.masked or masked_max_val is np.ma.masked:
        return None

    return MinMax(min=masked_min_val, max=masked_max_val)


class PickDirection(StrEnum):
    """Direction of the pick relative to the surface"""

    UPWARD = "UPWARD"
    DOWNWARD = "DOWNWARD"


@dataclass
class SurfaceWellPick:
    """Surface pick data along a well trajectory"""

    unique_wellbore_identifier: str
    x: float
    y: float
    z: float
    md: float
    direction: PickDirection


@dataclass
class WellTrajectory:
    """
    Well trajectory defined by a set of (x, y, z) coordinates and measured depths (md).

    unique_wellbore_identifier: str
    x_points: X-coordinates of well trajectory points.
    y_points: Y-coordinates of well trajectory points.
    z_points: Z-coordinates (depth values) of well trajectory points.
    md_points: Measured depth values at each well trajectory point.
    """

    unique_wellbore_identifier: str
    x_points: list[float]
    y_points: list[float]
    z_points: list[float]
    md_points: list[float]


def get_surface_picks_for_well_trajectory_from_xtgeo(
    surf: xtgeo.RegularSurface,
    well_trajectory: WellTrajectory,
) -> list[SurfaceWellPick] | None:
    """
    Calculate intersections (wellpicks) between a surface and a well trajectory.

    Uses the underlying xtgeo C-extension directly for performance.

    Note that this function performs interpolation internally to find the intersections. Thereby
    it can be inaccurate calculations of picks if the length between a well trajectory point and
    the next is large and the surface intersects between these points.

    """

    # Ensure equal length arrays
    if not (
        well_trajectory.x_points
        and well_trajectory.y_points
        and well_trajectory.z_points
        and well_trajectory.md_points
        and len(well_trajectory.x_points)
        == len(well_trajectory.y_points)
        == len(well_trajectory.z_points)
        == len(well_trajectory.md_points)
    ):
        raise InvalidParameterError(
            "Well trajectory point arrays must be non-empty and of equal length", Service.GENERAL
        )

    xarray = np.array(well_trajectory.x_points, dtype=np.float32)
    yarray = np.array(well_trajectory.y_points, dtype=np.float32)
    zarray = np.array(well_trajectory.z_points, dtype=np.float32)
    mdarray = np.array(well_trajectory.md_points, dtype=np.float32)

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
                unique_wellbore_identifier=well_trajectory.unique_wellbore_identifier,
                x=xres[i],
                y=yres[i],
                z=zres[i],
                md=mres[i],
                direction=PickDirection.DOWNWARD if dres[i] == 1 else PickDirection.UPWARD,
            )
        )
    return res
