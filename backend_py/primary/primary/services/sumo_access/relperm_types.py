from typing import List

from dataclasses import dataclass


@dataclass
class RelPermTableInfo:
    table_name: str
    saturation_names: List[str]


@dataclass
class RealizationBlobid:
    blob_name: str
    realization_id: str


@dataclass
class RelpermCurveData:
    curve_name: str
    curve_data: List[float]


@dataclass
class RelPermEnsembleSaturationData:
    saturation_curve_data: List[float]
    relperm_curves_data: List[RelpermCurveData]
    realizations: List[int]
