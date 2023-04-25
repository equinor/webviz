import base64

import xtgeo

from src.services.utils.surface_to_png import surface_to_png_bytes_optimized
from src.services.utils.surface_orientation import calc_surface_orientation_for_colormap_layer
from . import schemas


def to_api_surface_data(xtgeo_surf: xtgeo.RegularSurface) -> schemas.SurfaceData:
    """
    Create API SurfaceData from xtgeo regular surface
    """
    png_bytes: bytes = surface_to_png_bytes_optimized(xtgeo_surf)
    base64_data = base64.b64encode(png_bytes).decode("ascii")

    surf_orient = calc_surface_orientation_for_colormap_layer(xtgeo_surf)
    
    return schemas.SurfaceData(
        x_min=surf_orient.x_min,
        x_max=surf_orient.x_max,
        y_min=surf_orient.y_min,
        y_max=surf_orient.y_max,
        val_min=xtgeo_surf.values.min(),
        val_max=xtgeo_surf.values.max(),
        rot_deg=surf_orient.rot_around_xmin_ymax_deg,
        base64_encoded_image=f"{base64_data}"
    )
