from typing import List, Optional
from pydantic import BaseModel


def to_camel_case(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class WellBorePick(BaseModel):
    northing: float
    easting: float
    tvd: float
    tvd_msl: float
    md: float
    md_msl: float
    unique_wellbore_identifier: str
    pick_identifier: str
    confidence: Optional[str] = None
    depth_reference_point: str
    md_unit: str

    class Config:
        alias_generator = to_camel_case
        allow_population_by_field_name = True


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
    base_age: int
    top_age: int
    color_r: int
    color_g: int
    color_b: int
    strat_unit_level: int
    strat_unit_parent: Optional[str] = None
    lithology_type: int | float | str = "unknown"

    class Config:
        alias_generator = to_camel_case
        allow_population_by_field_name = True
