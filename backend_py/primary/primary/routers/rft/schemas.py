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


class RftObservation(BaseModel):
    value: float
    error: float
    property: str
    east: float
    north: float
    tvd: float
    md: float | None = None
    zone: str | None = None


class RftObservations(BaseModel):
    well_name: str
    date: str
    observations: list[RftObservation]
