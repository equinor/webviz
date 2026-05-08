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


class RelpermSaturationValues(BaseModel):
    satnum: int
    saturation_values: list[float]


class RelpermRealizationData(BaseModel):
    realization: int
    satnum: int
    curve_data: list[RelpermCurveData]


class RelpermRealizationDataResponse(BaseModel):
    saturation_name: str
    saturation_values_by_satnum: list[RelpermSaturationValues]
    realization_data: list[RelpermRealizationData]
