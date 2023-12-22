from typing import List, Optional
from pydantic import BaseModel


# from src.services.smda_access.types import WellBorePick, StratigraphicUnit


# class WellBorePicksAndStratigraphyUnits(BaseModel):
#     wellbore_picks: List[WellBorePick]
#     stratigraphy_units: List[StratigraphicUnit]


def to_camel_case(string: str) -> str:
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class CamelCaseBaseModel(BaseModel):
    class Config:
        alias_generator = to_camel_case
        allow_population_by_field_name = True


class StratigraphicUnit(CamelCaseBaseModel):
    """
    Needed for esvIntersection:
    - identifier
    - top
    - base
    - base_age
    - top_age
    - color_r
    - color_g
    - color_b
    - strat_unit_level
    - strat_unit_parent
    - lithology_type
    """

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


class WellBorePick(CamelCaseBaseModel):
    """
    Needed for esvIntersection:
    - pick_identifier
    - confidence
    - depth_reference_point
    - md
    - md_unit
    - tvd
    """

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


class WellBorePicksAndStratigraphyUnits(CamelCaseBaseModel):
    wellbore_picks: List[WellBorePick]
    stratigraphy_units: List[StratigraphicUnit]
