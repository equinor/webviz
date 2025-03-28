from enum import StrEnum
from typing import List, Dict

from pydantic import BaseModel


class RelPermSaturationAxis(BaseModel):
    saturation_name: str
    relperm_curve_names: List[str]
    capillary_pressure_curve_names: List[str]


class RelPermTableInfo(BaseModel):
    table_name: str
    saturation_axes: List[RelPermSaturationAxis]
    satnums: List[int]


class CurveData(BaseModel):
    curve_name: str
    curve_values: List[float]


class RelPermRealizationData(BaseModel):
    curve_data_arr: List[CurveData]
    realization_id: int
    saturation_name: str
    saturation_values: List[float]
    saturation_number: int
