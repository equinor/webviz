from typing import List

import orjson
import numpy as np
import xtgeo

from . import schemas


def surface_to_float32_array(values: np.ndarray) -> List[float]:
    values = values.astype(np.float32)
    values.fill_value = np.nan
    values = np.ma.filled(values)

    # Rotate 90 deg left.
    # This will cause the width of to run along the X axis
    # and height of along Y axis (starting from bottom.)
    values = np.rot90(values)

    return values.flatten().tolist()


def to_api_surface_data(
    xtgeo_surf: xtgeo.RegularSurface, property_values: np.ndarray
) -> schemas.SurfaceMeshAndProperty:
    """
    Create API SurfaceData from xtgeo regular surface
    """
    float32_mesh = surface_to_float32_array(xtgeo_surf.values)
    float32_property = surface_to_float32_array(property_values)

    return schemas.SurfaceMeshAndProperty(
        x_ori=xtgeo_surf.xori,
        y_ori=xtgeo_surf.yori,
        x_count=xtgeo_surf.ncol,
        y_count=xtgeo_surf.nrow,
        x_inc=xtgeo_surf.xinc,
        y_inc=xtgeo_surf.yinc,
        x_min=xtgeo_surf.xmin,
        x_max=xtgeo_surf.xmax,
        y_min=xtgeo_surf.ymin,
        y_max=xtgeo_surf.ymax,
        mesh_value_min=xtgeo_surf.values.min(),
        mesh_value_max=xtgeo_surf.values.max(),
        property_value_min=property_values.min(),
        property_value_max=property_values.max(),
        rot_deg=xtgeo_surf.rotation,
        mesh_data=orjson.dumps(float32_mesh),  # pylint: disable=maybe-no-member
        property_data=orjson.dumps(float32_property),  # pylint: disable=maybe-no-member
    )
