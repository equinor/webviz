from typing import List

from pydantic import BaseModel


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    time_or_interval_strings: List[str]


class StaticSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]


class SurfaceData(BaseModel):
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    val_min: float
    val_max: float
    rot_deg: float
    base64_encoded_image: str
