from pydantic import BaseModel


class RelpermSaturationAxis(BaseModel):
    saturation_name: str
    relperm_curve_names: list[str]
    capillary_pressure_curve_names: list[str]


class RelpermTableDefinition(BaseModel):
    table_name: str
    saturation_axes: list[RelpermSaturationAxis]
    satnums: list[int]
    realizations: list[int]


class RelpermCurveData(BaseModel):
    curve_name: str
    curve_values: list[float]


class RelpermRealizationData(BaseModel):
    realization: int
    satnum: int
    saturation_name: str
    saturation_values: list[float]
    curve_data: list[RelpermCurveData]
