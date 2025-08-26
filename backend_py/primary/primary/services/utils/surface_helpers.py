from dataclasses import dataclass

import numpy as np
import xtgeo
from numpy.typing import NDArray


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
