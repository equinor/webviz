from pydantic import BaseModel
from typing import Dict, List, Optional, Union


WellCompletionAttributeType = Union[str, int, bool, None]


class Completions(BaseModel):
    t: List[int]
    open: List[float]
    shut: List[float]
    kh_mean: List[float]
    kh_min: List[float]
    kh_max: List[float]


class WellCompletionWellInfo(BaseModel):
    name: str
    attributes: Dict[str, WellCompletionAttributeType]


class WellCompletionWell(WellCompletionWellInfo):
    completions: Dict[str, Completions]


class WellCompletionZone(BaseModel):
    name: str
    color: str
    subzones: Optional[List["WellCompletionZone"]] = None


class WellCompletionUnitInfo(BaseModel):
    unit: str
    decimalPlaces: int


class WellCompletionUnits(BaseModel):
    kh: WellCompletionUnitInfo


class WellCompletionDataSet(BaseModel):
    """Type definition for well completion data set"""

    version: str
    units: WellCompletionUnits
    stratigraphy: List[WellCompletionZone]
    timeSteps: List[str]
    wells: List[WellCompletionWell]
