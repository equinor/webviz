import datetime
from enum import Enum
from typing import List

from pydantic import BaseModel


class Frequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class StatisticFunction(str, Enum):
    MEAN = "MEAN"
    MIN = "MIN"
    MAX = "MAX"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class VectorDescription(BaseModel):
    name: str
    descriptive_name: str
    has_historical: bool


class VectorHistoricalData(BaseModel):
    timestamps_utc_ms: List[int]
    values: List[float]
    unit: str
    is_rate: bool


class VectorRealizationData(BaseModel):
    realization: int
    timestamps_utc_ms: List[int]
    values: List[float]
    unit: str
    is_rate: bool


class StatisticValueObject(BaseModel):
    statistic_function: StatisticFunction
    values: List[float]


class VectorStatisticData(BaseModel):
    realizations: List[int]
    timestamps_utc_ms: List[int]
    value_objects: List[StatisticValueObject]
    unit: str
    is_rate: bool


class VectorStatisticSensitivityData(BaseModel):
    realizations: List[int]
    timestamps_utc_ms: List[int]
    value_objects: List[StatisticValueObject]
    unit: str
    is_rate: bool
    sensitivity_name: str
    sensitivity_case: str


class VectorExpressionInfo(BaseModel):
    """
    `Description`:
    Dictionary with all required items for an expression

    `Required keys`:
    expression: str, mathematical expression
    variable_names: List[str], list of variable names
    vector_names: List[str], list of vector names
    """

    expression: str
    variable_names: str
    vector_names: str
