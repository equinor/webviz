from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel
from .generic_types import SumoContent


class SurfaceMeta(BaseModel):
    name: str
    tagname: str
    iso_date_or_interval: Optional[str] = None
    content: SumoContent
    is_observation: bool
    is_stratigraphic: bool
    zmin: Optional[float] = None
    zmax: Optional[float] = None


class XtgeoSurfaceIntersectionPolyline(BaseModel):
    """
    Type definition for surface intersection polyline data needed as `fencespec` argument
    for the xtgeo.get_randomline() function

    The polyline is defined by the `X`, `Y`, `Z` and `HLEN` fields, and is provided to
    the `get_randomline()` function as a list of `XtgeoSurfaceIntersectionPolyline` objects
    """

    X: List[float]
    Y: List[float]
    Z: List[float]
    HLEN: List[float]


class XtgeoSurfaceIntersectionResult(BaseModel):
    """
    Type definition for surface intersection data from xtgeo.get_randomline() function

    The `name` field is in addition to the fields returned by the `get_randomline()` function

    `zval` are the z values of the intersection points (depth values for each (x,y) point in polyline.
    `dist` are the distance at each z value (accumulated).
    """

    name: str
    distance: List[float]
    zval: List[float]
