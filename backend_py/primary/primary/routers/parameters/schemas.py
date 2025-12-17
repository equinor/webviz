from enum import Enum

from pydantic import BaseModel


class EnsembleParameter(BaseModel):
    """Description/data for a single parameter in an ensemble"""

    name: str
    isLogarithmic: bool
    isDiscrete: bool  # values are string or integer
    isConstant: bool  # all values are equal
    groupName: str | None = None
    descriptiveName: str | None = None
    realizations: list[int]
    values: list[float] | list[int] | list[str]


class SensitivityType(str, Enum):
    MONTECARLO = "montecarlo"
    SCENARIO = "scenario"


class EnsembleSensitivityCase(BaseModel):
    """Description/data for a single sensitivity case in an ensemble"""

    name: str
    realizations: list[int]


class EnsembleSensitivity(BaseModel):
    """Description/data for a single sensitivity in an ensemble"""

    name: str
    type: SensitivityType
    cases: list[EnsembleSensitivityCase]


class EnsembleParametersAndSensitivities(BaseModel):
    """Description/data for all parameters and sensitivities in an ensemble"""

    parameters: list[EnsembleParameter]
    sensitivities: list[EnsembleSensitivity]
