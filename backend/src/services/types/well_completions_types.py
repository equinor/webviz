from pydantic import BaseModel
from typing import Dict, List, Optional, Union


AttributeType = Union[str, int, bool, None]


class Completions(BaseModel):
    t: List[int]
    open: List[float]
    shut: List[float]
    khMean: List[float]
    khMin: List[float]
    khMax: List[float]


class WellInfo(BaseModel):
    name: str
    attributes: Dict[str, AttributeType]


class Well(WellInfo):
    completions: Dict[str, Completions]


class Zone(BaseModel):
    name: str
    color: str
    subzones: Optional[List["Zone"]] = None


class UnitInfo(BaseModel):
    unit: str
    decimalPlaces: int


class Units(BaseModel):
    kh: UnitInfo


class WellCompletionDataSet(BaseModel):
    """Type definition for well completion data set"""

    version: str
    units: Units
    stratigraphy: List[Zone]
    timeSteps: List[str]
    wells: List[Well]
