from pydantic import BaseModel
import xtgeo
import numpy as np


class XtgeoSurfaceIntersectionPolyline(BaseModel):
    """
    Type definition for surface intersection polyline data needed as `fencespec` argument
    for the xtgeo.get_randomline() function

    The polyline is defined by the `X`, `Y`, `Z` and `HLEN` fields, and is provided to
    the `get_randomline()` function as a list of `XtgeoSurfaceIntersectionPolyline` objects
    """

    X: list[float]
    Y: list[float]
    Z: list[float]
    HLEN: list[float]


class XtgeoSurfaceIntersectionResult(BaseModel):
    """
    Type definition for surface intersection data from xtgeo.get_randomline() function

    The `name` field is in addition to the fields returned by the `get_randomline()` function

    `zval` are the z values of the intersection points (depth values for each (x,y) point in polyline.
    `dist` are the distance at each z value (accumulated).
    """

    name: str
    distance: list[float]
    zval: list[float]


def intersect_surface_with_polyline(
    surface: xtgeo.RegularSurface,
    polyline: XtgeoSurfaceIntersectionPolyline,
) -> XtgeoSurfaceIntersectionResult:
    """
    Get intersection of realization surface for requested surface name
    """
    # The input fencespec is a 2D numpy where each row is X, Y, Z, HLEN,
    # where X, Y are UTM coordinates, Z is depth/time, and HLEN is a
    # length along the fence.
    xtgeo_fencespec = np.array([polyline.X, polyline.Y, polyline.Z, polyline.HLEN]).T

    line = surface.get_randomline(xtgeo_fencespec)

    intersection = XtgeoSurfaceIntersectionResult(
        name=f"{surface.name}",
        distance=line[:, 0].tolist(),
        zval=line[:, 1].tolist(),
    )

    return intersection
