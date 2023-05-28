from typing import List, Optional, Union
from enum import Enum

from pydantic import BaseModel


class SumoEnsembleParameter(BaseModel):
    name: str
    groupname: Optional[str]
    values: List[Union[str, int, float]]
    realizations: List[int]


class EnsembleParameter(BaseModel):
    """Description/data for a single parameter in an ensemble"""

    name: str
    is_logarithmic: bool
    is_numerical: bool
    is_constant: bool  # all values are equal
    group_name: Optional[str]
    descriptive_name: Optional[str]
    realizations: List[int]
    values: List[Union[str, int, float]]


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


class EnsembleParameters(BaseModel):
    """Description/data for all parameters in an ensemble"""

    parameters: List[EnsembleParameter]
    sensitivities: Optional[List[EnsembleSensitivity]]
