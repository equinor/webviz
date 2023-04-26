from typing import List

import numpy as np
import xtgeo


def surface_to_float32_array(surface: xtgeo.RegularSurface) -> List[float]:
    values = surface.values.astype(np.float32)
    values.fill_value = np.nan
    values = np.ma.filled(values)

    # Rotate 90 deg left.
    # This will cause the width of to run along the X axis
    # and height of along Y axis (starting from bottom.)
    values = np.rot90(values)

    return values.flatten().tolist()
