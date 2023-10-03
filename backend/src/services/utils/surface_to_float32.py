import numpy as np
from numpy.typing import NDArray
import xtgeo


def surface_to_float32_numpy_array(surface: xtgeo.RegularSurface) -> NDArray[np.float32]:
    masked_values = surface.values.astype(np.float32)
    values = np.ma.filled(masked_values, fill_value=np.nan)

    # Rotate 90 deg left.
    # This will cause the width of to run along the X axis
    # and height of along Y axis (starting from bottom.)
    values = np.rot90(values)

    return values.flatten()
