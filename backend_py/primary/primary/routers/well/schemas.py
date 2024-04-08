from typing import List, Optional
from pydantic import BaseModel


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


class WellBorePicksAndStratigraphicUnits(BaseModel):
    wellbore_picks: List[WellBorePick] = []
    stratigraphic_units: List[StratigraphicUnit] = []


class WellBoreCasing(BaseModel):
    item_type: str  # Casing type
    diameter_numeric: float
    diameter_inner: float
    description: str | None = None
    remark: str | None = None
    depth_top_md: float
    depth_bottom_md: float
    total_depth_md: float
    start_depth: float
    end_depth: float


class WellBoreLogCurveInfo(BaseModel):
    log_name: str
    curve_name: str
    curve_unit: str


class WellBoreLogCurveData(BaseModel):
    index_min: float
    index_max: float
    min_curve_value: float
    max_curve_value: float
    DataPoints: list[list[float | None]]
    curve_alias: str
    curve_description: str
    index_unit: str
    no_data_value: float
