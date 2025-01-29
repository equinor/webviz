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
    unit: str | None = None


class RelPermRealizationCurveData(BaseModel):
    curve_name: str
    curve_values: List[float]
    realization_id: int


class RelPermRealizationData(BaseModel):
    saturation_number: int
    saturation_axis_data: CurveData
    relperm_curve_data: List[RelPermRealizationCurveData]


class RelPermCurveNames(StrEnum):
    KRW = "Relative permeability water"
    KRG = "Relative permeability gas"
    KROW = "Relative permeability oil water"
    KROG = "Relative permeability oil gas"
    PCOW = "Capilar pressure oil water"
    PCOG = "Capilar pressure oil gas"


class Statistic(StrEnum):
    """
    Definition of possible statistics
    """

    MEAN = "mean"
    STD_DEV = "stddev"
    MAX = "max"
    MIN = "min"
    P10 = "p10"
    P90 = "p90"


class RelPermStatisticalCurveData(BaseModel):
    curve_name: str
    curve_values: Dict[Statistic, List[float]]


class RelPermStatisticalDataForSaturation(BaseModel):
    saturation_axis_data: CurveData
    saturation_number: int
    relperm_curve_data: List[RelPermStatisticalCurveData]
