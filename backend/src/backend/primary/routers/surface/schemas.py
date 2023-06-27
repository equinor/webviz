from enum import Enum
from typing import List

from pydantic import BaseModel


class SurfaceStatisticFunction(str, Enum):
    MEAN = "MEAN"
    STD = "STD"
    MIN = "MIN"
    MAX = "MAX"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class SurfaceType(str, Enum):
    DEPTH = "depth"
    TIME = "time"
    PROPERTY = "property"


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    time_or_interval_strings: List[str]


class StaticSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    valid_attributes_for_name: List[List[int]]


class SurfaceData(BaseModel):
    x_ori: float
    y_ori: float
    x_count: int
    y_count: int
    x_inc: float
    y_inc: float
    val_min: float
    val_max: float
    rot_deg: float
    mesh_data: str
