from dataclasses import dataclass


@dataclass(frozen=True)
class RelpermSaturationAxis:
    saturation_name: str
    relperm_curve_names: list[str]
    capillary_pressure_curve_names: list[str]


@dataclass(frozen=True)
class RelpermTableDefinition:
    table_name: str
    saturation_axes: list[RelpermSaturationAxis]
    satnums: list[int]
    realizations: list[int]


@dataclass(frozen=True)
class RelpermCurveData:
    curve_name: str
    curve_values: list[float]


@dataclass(frozen=True)
class RelpermRealizationData:
    realization: int
    satnum: int
    saturation_name: str
    saturation_values: list[float]
    curve_data: list[RelpermCurveData]
