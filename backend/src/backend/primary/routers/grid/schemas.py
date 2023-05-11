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
