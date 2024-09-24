from pydantic import BaseModel


WellCompletionsAttributeType = str| int| bool


class Completions(BaseModel):
    sorted_completion_date_indices: list[int]
    open: list[float]
    shut: list[float]
    kh_mean: list[float]
    kh_min: list[float]
    kh_max: list[float]


class WellCompletionsWell(BaseModel):
    name: str
    attributes: dict[str, WellCompletionsAttributeType]
    completions: dict[str, Completions]


class WellCompletionsZone(BaseModel):
    name: str
    subzones: list["WellCompletionsZone"] | None = None


class WellCompletionsUnitInfo(BaseModel):
    unit: str
    decimalPlaces: int


class WellCompletionsUnits(BaseModel):
    kh: WellCompletionsUnitInfo


class WellCompletionsData(BaseModel):
    """Type definition for well completions data"""

    version: str
    units: WellCompletionsUnits
    zones: list[WellCompletionsZone]
    sorted_completion_dates: list[str]
    wells: list[WellCompletionsWell]
