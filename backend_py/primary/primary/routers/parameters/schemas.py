from typing import List, Optional, Union
from enum import Enum

from pydantic import BaseModel


class EnsembleParameter(BaseModel):
    """Description/data for a single parameter in an ensemble"""

    name: str
    isLogarithmic: bool
    isDiscrete: bool  # values are string or integer
    isConstant: bool  # all values are equal
    groupName: Optional[str] = None
    descriptiveName: Optional[str] = None
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
