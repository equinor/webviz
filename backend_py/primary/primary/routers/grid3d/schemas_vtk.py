from typing import List

from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray, B64UintArray


class GridSurfaceVtk(BaseModel):
    polys_b64arr: B64UintArray
    points_b64arr: B64FloatArray
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    zmin: float
    zmax: float


class GridIntersectionVtk(BaseModel):
    image: str
    polyline_x: List[float]
    polyline_y: List[float]
    x_min: float
    x_max: float
    y_min: float
    y_max: float
