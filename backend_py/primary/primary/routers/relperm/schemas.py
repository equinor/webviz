from typing import List

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
    unit: str | None = None


class RealizationCurveData(BaseModel):
    curve_name: str
    curve_values: List[float]
    realization_id: int


class RelPermRealizationDataForSaturation(BaseModel):
    saturation_number: int
    saturation_axis_data: CurveData
    relperm_curve_data: List[RealizationCurveData]
