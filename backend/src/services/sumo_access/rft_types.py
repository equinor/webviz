from enum import Enum

from pydantic import BaseModel


class RftColumnNames(str, Enum):
    WELL = "WELL"
    DEPTH = "DEPTH"
    PRESSURE = "PRESSURE"


class RftSumoTableSchema(BaseModel):
    tagname: str
    column_names: list[str]


class RftWellInfo(BaseModel):
    well_name: str
    timestamps_utc_ms: list[int]


# class RftRealizationResponse(BaseModel):
#     realization: int
#     depth: list[float]
#     pressure: list[float]


# class RftTimestampResponse(BaseModel):
#     timestamp_utc_ms: int
#     realizations_response: list[RftRealizationResponse]


# class RftWellResponse(BaseModel):
#     well_name: str
#     timestamps_response: list[RftTimestampResponse]


class RftWellRealizationData(BaseModel):
    well_name: str
    realization: int
    timestamp_utc_ms: int
    depth_arr: list[float]
    value_arr: list[float]
