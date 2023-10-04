from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class WellBorePick(BaseModel):
    northing: float
    easting: float
    tvd: float
    tvd_msl: float
    md: float
    md_msl: float
    unique_wellbore_identifier: str
    pick_identifier: str


class WellBoreTrajectory(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    tvd_msl_arr: List[float]
    md_arr: List[float]
    easting_arr: List[float]
    northing_arr: List[float]


class WellBoreHeader(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    wellbore_purpose: str
    easting: Optional[float] = None
    northing: Optional[float] = None
    parent_wellbore: Optional[str] = None
    total_depth_driller_tvd: Optional[float] = None
    total_depth_driller_md: Optional[float] = None
    drill_start_date: Optional[str] = None
    drill_end_date: Optional[str] = None


class StratigraphicUnit(BaseModel):
    identifier: str
    top: str
    base: str
    strat_unit_level: int
    strat_unit_type: str
    top_age: Optional[int | float]
    strat_unit_parent: Optional[str]
    color_r: int
    color_g: int
    color_b: int


class StratigraphicFeature(str, Enum):
    """The stratigraphic feature of a surface"""

    ZONE = "zone"  # identifier
    HORIZON = "horizon"  # top/base


class StratigraphicSurface(BaseModel):
    name: str
    feature: StratigraphicFeature
    relative_strat_unit_level: int = 0
    strat_unit_parent: Optional[str] = None
    strat_unit_identifier: Optional[str] = None
