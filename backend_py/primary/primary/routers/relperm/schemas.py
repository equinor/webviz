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


class RelPermSatNumData(BaseModel):
    satnum: int
    relperm_curves_data: List[List[float]]


class RelPermRealizationData(BaseModel):
    saturation_axis_data: List[float]
    satnum_data: List[RelPermSatNumData]
    realization: int
