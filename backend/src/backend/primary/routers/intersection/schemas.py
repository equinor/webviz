from typing import List

from pydantic import BaseModel


class CuttingPlane(BaseModel):
    x_arr: List[float]
    y_arr: List[float]
    h_arr: List[float]


class SurfaceIntersectionData(BaseModel):
    name: str
    z_arr: List[float]
    hlen_arr: List[float]
    unit: str = "m"
    depthReference: str = "MSL"
    context: str = "depth"
    stratigraphicalInterval: bool = True


class CubeIntersectionData(BaseModel):
    xy_arr_string: str
    z_arr_string: str
