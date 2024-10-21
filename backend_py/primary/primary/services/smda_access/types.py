from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class WellborePick(BaseModel):
    """
    Wellbore pick from SMDA

    Attributes needed for esvIntersection component
    """

    northing: float
    easting: float
    tvd: float
    tvd_msl: float
    md: float
    md_msl: float
    unique_wellbore_identifier: str
    wellbore_uuid: str
    pick_identifier: str
    confidence: Optional[str] = None
    depth_reference_point: str
    md_unit: str


class WellboreTrajectory(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    tvd_msl_arr: List[float]
    md_arr: List[float]
    easting_arr: List[float]
    northing_arr: List[float]


class WellboreHeader(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    well_uuid: str
    unique_well_identifier: str
    well_easting: float
    well_northing: float
    depth_reference_point: str
    depth_reference_elevation: float
    wellbore_purpose: str | None
    wellbore_status: str | None


class StratigraphicColumn(BaseModel):
    """
    Stratigraphic column from SMDA
    """

    strat_column_identifier: str
    strat_column_area_type: str
    strat_column_status: str
    strat_column_type: str | None


class StratigraphicUnit(BaseModel):
    """
    Stratigraphic unit from SMDA

    Attributes needed for esvIntersection component
    """

    identifier: str
    top: str
    base: str
    strat_unit_level: int
    strat_unit_type: str
    top_age: int | float
    base_age: int | float
    strat_unit_parent: Optional[str] = None
    color_r: int
    color_g: int
    color_b: int
    lithology_type: int | float | str = "unknown"

    strat_column_identifier: str
    strat_column_type: str | None
    strat_unit_identifier: str
    entry_md: float
    exit_md: float


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


# pylint: disable-next=missing-class-docstring
class WellboreGeoHeader(BaseModel):
    uuid: str
    identifier: str
    geol_type: str
    md_min: float
    md_max: float
    md_unit: str
    source: str
    # description: str | None


# pylint: disable-next=missing-class-docstring
class WellboreGeoData(BaseModel):
    uuid: str
    identifier: str
    geol_type: str
    geol_group: str
    code: int

    top_depth_md: float
    base_depth_md: float

    color_r: int
    color_g: int
    color_b: int
