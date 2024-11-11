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


class RelPermRealizationDataForSaturation(BaseModel):
    saturation_number: int
    relperm_curve_data: List[CurveData]


class SaturationRealizationData(BaseModel):
    saturation_axis_data: CurveData
    satnum_data: List[RelPermRealizationDataForSaturation]
    realization_id: int
