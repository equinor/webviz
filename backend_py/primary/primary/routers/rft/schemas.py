from pydantic import BaseModel


class RftWellInfo(BaseModel):
    well_name: str
    timestamps_utc_ms: list[int]


class RftTableDefinition(BaseModel):
    response_names: list[str]
    well_infos: list[RftWellInfo]


class RftRealizationData(BaseModel):
    well_name: str
    realization: int
    timestamp_utc_ms: int
    depth_arr: list[float]
    value_arr: list[float]
