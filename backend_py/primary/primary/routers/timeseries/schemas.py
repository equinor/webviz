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
    sourceVector: str


class VectorDescription(BaseModel):
    name: str
    descriptiveName: str
    hasHistorical: bool
    derivedVector: DerivedVector | None = None


class VectorHistoricalData(BaseModel):
    timestampsUtcMs: List[int]
    values: List[float]
    unit: str
    isRate: bool


class VectorRealizationData(BaseModel):
    realization: int
    timestampsUtcMs: List[int]
    values: List[float]
    unit: str
    isRate: bool
    derivedVector: DerivedVector | None = None


class StatisticValueObject(BaseModel):
    statisticFunction: StatisticFunction
    values: List[float]


class VectorStatisticData(BaseModel):
    realizations: List[int]
    timestampsUtcMs: List[int]
    valueObjects: List[StatisticValueObject]
    unit: str
    isRate: bool
    derivedVector: DerivedVector | None = None


class VectorStatisticSensitivityData(BaseModel):
    realizations: List[int]
    timestampsUtcMs: List[int]
    valueObjects: List[StatisticValueObject]
    unit: str
    isRate: bool
    sensitivityName: str
    sensitivityCase: str
