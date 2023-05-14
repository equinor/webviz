from typing import List

from pydantic import BaseModel


class B64EncodedNumpyArray(BaseModel):
    bvals: str
    dtype: str
    shape: List[int]


class GridGeometry(BaseModel):
    polys: dict
    points: dict
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    zmin: float
    zmax: float


class GridIntersection(BaseModel):
    image: str
    polyline_x: List[float]
    polyline_y: List[float]
    x_min: float
    x_max: float
    y_min: float
    y_max: float
