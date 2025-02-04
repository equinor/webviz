from enum import StrEnum

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


class DerivedVectorType(StrEnum):
    PER_DAY = "PER_DAY"
    PER_INTVL = "PER_INTVL"


class DerivedVectorInfo(BaseModel):
    type: DerivedVectorType
    sourceVector: str


class VectorDescription(BaseModel):
    name: str
    descriptiveName: str
    hasHistorical: bool
    derivedVectorInfo: DerivedVectorInfo | None = None


class VectorHistoricalData(BaseModel):
    timestampsUtcMs: list[int]
    values: list[float]
    unit: str
    isRate: bool


class VectorRealizationData(BaseModel):
    realization: int
    timestampsUtcMs: list[int]
    values: list[float]
    unit: str
    isRate: bool
    derivedVectorInfo: DerivedVectorInfo | None = None


class StatisticValueObject(BaseModel):
    statisticFunction: StatisticFunction
    values: list[float]


class VectorStatisticData(BaseModel):
    realizations: list[int]
    timestampsUtcMs: list[int]
    valueObjects: list[StatisticValueObject]
    unit: str
    isRate: bool
    derivedVectorInfo: DerivedVectorInfo | None = None


class VectorStatisticSensitivityData(BaseModel):
    realizations: list[int]
    timestampsUtcMs: list[int]
    valueObjects: list[StatisticValueObject]
    unit: str
    isRate: bool
    sensitivityName: str
    sensitivityCase: str
