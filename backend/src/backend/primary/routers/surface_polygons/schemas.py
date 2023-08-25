from typing import List

from pydantic import BaseModel


class SurfacePolygonDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    valid_attributes_for_name: List[List[int]]


class PolygonData(BaseModel):
    x_arr: List[float]
    y_arr: List[float]
    z_arr: List[float]
    poly_id: int | str
