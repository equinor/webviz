from dataclasses import dataclass
import math

import xtgeo


@dataclass(frozen=True)
class SurfaceOrientationForColormapLayer:
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    rot_around_xmin_ymax_deg: float


def calc_surface_orientation_for_colormap_layer(
    surface: xtgeo.RegularSurface,
) -> SurfaceOrientationForColormapLayer:
    """
    Computes orientation (bounds and rotation) suitable for use with
    colormapLayer in the DeckGLMap component.

    The surfaceLayer expects rotation of image to be specified counterclockwise in
    degrees around the upper left (minx, maxy) corner of the bounding box.
    This function calculates a suitable bounding box and rotation for this specific usage.
    """

    # This function only yields correct results for surfaces with yflip=1
    if surface.yflip < 0:
        raise NotImplementedError("Only surfaces with yflip=1 are supported")

    # Returns four xy tuples, (x0,y0), (x1,y1), (x2,y2), (x3,y3) with the corner
    # coordinates of the (possibly rotated) surface. According to xtgeo doc, for
    # surfaces with yflip=1 and no rotation, the (x2,y2) tuple will be the upper left
    # corner. We therefore choose it as the rotation point when we unrotate the surface
    # to obtain the suitable bounding box to return.
    surf_corners = surface.get_map_xycorners()
    rptx = surf_corners[2][0]
    rpty = surf_corners[2][1]
    angle = -surface.rotation * math.pi / 180

    min_x = math.inf
    max_x = -math.inf
    min_y = math.inf
    max_y = -math.inf
    for coord in surf_corners:
        xpos = coord[0]
        ypos = coord[1]
        x_unrot = rptx + ((xpos - rptx) * math.cos(angle)) - ((ypos - rpty) * math.sin(angle))
        y_unrot = rpty + ((xpos - rptx) * math.sin(angle)) + ((ypos - rpty) * math.cos(angle))

        min_x = min(min_x, x_unrot)
        max_x = max(max_x, x_unrot)
        min_y = min(min_y, y_unrot)
        max_y = max(max_y, y_unrot)

    return SurfaceOrientationForColormapLayer(
        x_min=min_x,
        x_max=max_x,
        y_min=min_y,
        y_max=max_y,
        rot_around_xmin_ymax_deg=surface.rotation,
    )
