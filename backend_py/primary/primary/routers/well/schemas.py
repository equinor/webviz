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


class WellboreHeader(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    well_uuid: str
    unique_well_identifier: str
    well_easting: float
    well_northing: float
    depth_reference_point: str
    depth_reference_elevation: float


class WellboreTrajectory(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    tvd_msl_arr: List[float]
    md_arr: List[float]
    easting_arr: List[float]
    northing_arr: List[float]


class WellborePick(BaseModel):
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


class WellborePicksAndStratigraphicUnits(BaseModel):
    wellbore_picks: List[WellborePick] = []
    stratigraphic_units: List[StratigraphicUnit] = []


class WellboreCompletion(BaseModel):
    md_top: float
    md_bottom: float
    tvd_top: float | None
    tvd_bottom: float | None
    description: str | None
    symbol_name: str | None
    comment: str | None


class WellboreCasing(BaseModel):
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


class WellborePerforation(BaseModel):
    md_top: float
    md_bottom: float
    tvd_top: float
    tvd_bottom: float
    status: str
    completion_mode: str


class WellboreLogCurveInfo(BaseModel):
    log_name: str
    curve_name: str
    curve_unit: str


class WellboreLogCurveData(BaseModel):
    index_min: float
    index_max: float
    min_curve_value: float
    max_curve_value: float
    DataPoints: list[list[float | None]]
    curve_alias: str
    curve_description: str
    index_unit: str
    no_data_value: float
