from typing import List, Optional, Any
from datetime import datetime

from pydantic import BaseModel, NonNegativeFloat


class StratigraphicUnit(BaseModel):
    """
    Stratigraphic unit from SMDA

    Camel case attributes needed for esvIntersection component in front-end
    """

    identifier: str
    top: str
    base: str
    stratUnitLevel: int
    stratUnitType: str
    topAge: int | float
    baseAge: int | float
    stratUnitParent: Optional[str] = None
    colorR: int
    colorG: int
    colorB: int
    lithologyType: int | float | str = "unknown"


class WellBorePick(BaseModel):
    """
    Wellbore pick from SMDA

    Camel case attributes needed for esvIntersection component in front-end
    """

    northing: float
    easting: float
    tvd: float
    tvdMsl: float
    md: float
    mdMsl: float
    uniqueWellboreIdentifier: str
    pickIdentifier: str
    confidence: Optional[str] = None
    depthReferencePoint: str
    mdUnit: str


class WellBoreCompletion(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    wellbore_status: str
    wellbore_purpose: str
    completion_type: str
    completion_open_flag: bool
    top_depth_md: NonNegativeFloat
    base_depth_md: NonNegativeFloat
    md_unit: str
    date_opened: datetime
    date_closed: Optional[datetime] = None


class WellBorePicksAndStratigraphicUnits(BaseModel):
    wellbore_picks: List[WellBorePick] = []
    stratigraphic_units: List[StratigraphicUnit] = []
