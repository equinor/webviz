from pydantic import BaseModel

from primary.services.sumo_access.well_completions_types import WellCompletionsAttributeType


class Completions(BaseModel):
    sortedCompletionDateIndices: list[int]
    open: list[float]
    shut: list[float]
    khMean: list[float]
    khMin: list[float]
    khMax: list[float]


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
    sortedCompletionDates: list[str]
    wells: list[WellCompletionsWell]
