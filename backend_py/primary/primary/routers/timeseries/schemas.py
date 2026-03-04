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


class VectorRealizationsData(BaseModel):
    """Compact representation of multiple vectors across realizations.

    All realizations share the same resampled timestamp grid.
    ``valuesPerRealization`` is indexed as ``[real_idx][timestep_idx]``
    where ``real_idx`` corresponds to ``realizations[real_idx]``.
    """

    vectorName: str
    realizations: list[int]
    timestampsUtcMs: list[int]
    valuesPerRealization: list[list[float]]


class GroupedVectorEntry(BaseModel):
    """One group's summed values, without repeating realizations/timestamps."""

    groupLabel: str
    valuesPerRealization: list[list[float]]


class GroupedRealizationsVectorData(BaseModel):
    """Compact response for grouped realization vector data.

    ``realizations`` and ``timestampsUtcMs`` are shared across all groups
    and appear only once at the top level.  Each ``GroupedVectorEntry``
    carries the group label and the per-realization value arrays.
    """

    realizations: list[int]
    timestampsUtcMs: list[int]
    groups: list[GroupedVectorEntry]


class VectorGroupInput(BaseModel):
    """A named group of vector names to be summed element-wise on the server.

    The server will fetch all ``vectorNames``, sum their
    ``valuesPerRealization`` arrays element-wise per realization, and
    return the result under ``groupLabel``.
    """

    groupLabel: str
    vectorNames: list[str]


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
