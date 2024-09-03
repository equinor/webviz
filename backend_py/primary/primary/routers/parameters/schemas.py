from enum import Enum
from typing import Optional, List, Union

from pydantic import BaseModel


class EnsembleParameterDescription(BaseModel):
    name: str
    group_name: Optional[str] = None
    descriptive_name: Optional[str] = None
    is_numerical: bool


class EnsembleParameter(BaseModel):
    """Description/data for a single parameter in an ensemble"""

    name: str
    is_logarithmic: bool
    is_numerical: bool
    is_constant: bool  # all values are equal
    group_name: Optional[str] = None
    descriptive_name: Optional[str] = None
    realizations: List[int]
    values: Union[List[float], List[int], List[str]]


class SensitivityType(str, Enum):
    MONTECARLO = "montecarlo"
    SCENARIO = "scenario"


class EnsembleSensitivityCase(BaseModel):
    """Description/data for a single sensitivity case in an ensemble"""

    name: str
    realizations: List[int]


class EnsembleSensitivity(BaseModel):
    """Description/data for a single sensitivity in an ensemble"""

    name: str
    type: SensitivityType
    cases: List[EnsembleSensitivityCase]


class EnsembleParameters(BaseModel):  # Find a better name
    """Description/data for all parameters in an ensemble
    type: "sensitivity" | "historymatch" | "prediction ??"
    """

    parameters: List[EnsembleParameter]
    sensitivities: Optional[List[EnsembleSensitivity]] = None
