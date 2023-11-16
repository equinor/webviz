from pydantic import BaseModel


class RftInfo(BaseModel):
    well_name: str
    timestamps_utc_ms: list[int]


class RftRealizationData(BaseModel):
    well_name: str
    realization: int
    timestamp_utc_ms: int
    depth_arr: list[float]
    value_arr: list[float]
