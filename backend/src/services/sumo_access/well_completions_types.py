from typing import Dict, List, Optional, Union
from pydantic import BaseModel


WellCompletionsAttributeType = Union[str, int, bool]


class Completions(BaseModel):
    t: List[int]
    open: List[float]
    shut: List[float]
    kh_mean: List[float]
    kh_min: List[float]
    kh_max: List[float]


class WellCompletionsWell(BaseModel):
    name: str
    attributes: Dict[str, WellCompletionsAttributeType]
    completions: Dict[str, Completions]


class WellCompletionsZone(BaseModel):
    name: str
    subzones: Optional[List["WellCompletionsZone"]] = None


class WellCompletionsUnitInfo(BaseModel):
    unit: str
    decimalPlaces: int


class WellCompletionsUnits(BaseModel):
    kh: WellCompletionsUnitInfo


class WellCompletionsData(BaseModel):
    """Type definition for well completions data"""

    version: str
    units: WellCompletionsUnits
    zones: List[WellCompletionsZone]
    timeSteps: List[str]
    wells: List[WellCompletionsWell]
