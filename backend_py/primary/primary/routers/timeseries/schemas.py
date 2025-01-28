from enum import StrEnum
from typing import List

from pydantic import BaseModel


class Frequency(StrEnum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class StatisticFunction(StrEnum):
    MEAN = "MEAN"
    MIN = "MIN"
    MAX = "MAX"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class DerivedVectorCategory(StrEnum):
    PER_DAY = "PER_DAY"
    PER_INTVL = "PER_INTVL"


class DerivedVector(BaseModel):
    category: DerivedVectorCategory
    source_vector: str


class VectorDescription(BaseModel):
    name: str
    descriptive_name: str
    has_historical: bool
    derived_vector: DerivedVector | None = None


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
    derived_vector_category: DerivedVectorCategory | None = None


class StatisticValueObject(BaseModel):
    statistic_function: StatisticFunction
    values: List[float]


class VectorStatisticData(BaseModel):
    realizations: List[int]
    timestamps_utc_ms: List[int]
    value_objects: List[StatisticValueObject]
    unit: str
    is_rate: bool
    derived_vector_category: DerivedVectorCategory | None = None


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
