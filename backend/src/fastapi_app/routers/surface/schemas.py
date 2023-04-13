from enum import Enum
from typing import List, Tuple, Dict

from pydantic import BaseModel


class SurfaceStatisticFunction(str, Enum):
    MEAN = "MEAN"
    STD = "STD"
    MIN = "MIN"
    MAX = "MAX"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    time_or_interval_strings: List[str]


class StaticSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    valid_attributes_for_name: List[List[int]]


class SurfaceData(BaseModel):
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    val_min: float
    val_max: float
    rot_deg: float
    base64_encoded_image: str
