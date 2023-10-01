from typing import List

from pydantic import BaseModel


class VdsAxis(BaseModel):
    annotation: str
    max: float
    min: float
    samples: int
    unit: str


class VdsBoundingBox(BaseModel):
    cdp: List[List[float]]
    ij: List[List[float]]
    ilxl: List[List[float]]


class VdsMetaData(BaseModel):
    axis: List[VdsAxis]
    boundingBox: VdsBoundingBox
    crs: str


class VdsSliceResponse(BaseModel):
    values: List[List[float]]
    geospatial: List[List[float]]
    shape: List[int]
    x: VdsAxis
    y: VdsAxis


class VdsFenceResponse(BaseModel):
    values: List[List[float]]
    shape: List[int]
