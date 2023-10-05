from typing import List, Optional
from pydantic import BaseModel


def to_camel_case(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class StratigraphicUnit(BaseModel):
    identifier: str
    top: str
    base: str
    top_age: Optional[int | float] = None
    base_age: Optional[int | float] = None
    color_r: int
    color_g: int
    color_b: int
    strat_unit_level: int
    strat_unit_parent: Optional[str] = None
    lithology_type: int | float | str = "unknown"

    class Config:
        alias_generator = to_camel_case
        populate_by_name = True


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
        populate_by_name = True


class WellBorePicksAndStratUnits(BaseModel):
    picks: List[WellBorePick]
    strat_units: List[StratigraphicUnit]

    class Config:
        alias_generator = to_camel_case
        populate_by_name = True
