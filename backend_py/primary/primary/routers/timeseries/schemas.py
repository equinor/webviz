from enum import StrEnum

from pydantic import BaseModel, Field


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


class SourceCoverageRole(StrEnum):
    REGULAR = "REGULAR"
    COMPARISON = "COMPARISON"
    REFERENCE = "REFERENCE"


class SourceCoverageIntervalStatus(StrEnum):
    """
    Evaluated in this order:
    UNSUPPORTED: no positive-duration overlap with the common support of all required sources.
    PARTIAL: positive overlap, but an interval boundary is outside at least one required source range.
    SOURCE_ALIGNED: fully supported, and both boundaries are raw sample timestamps in every required source.
    INTERPOLATED: fully supported, but at least one boundary is linearly interpolated.
    """

    SOURCE_ALIGNED = "SOURCE_ALIGNED"
    INTERPOLATED = "INTERPOLATED"
    PARTIAL = "PARTIAL"
    UNSUPPORTED = "UNSUPPORTED"


class SourceCoverageInterpolationMethod(StrEnum):
    LINEAR = "LINEAR"


class VectorSourceSummary(BaseModel):
    """Raw, validated source samples for this realization and vector (not ensemble-wide, not prediction start)"""

    role: SourceCoverageRole
    firstTimestampUtcMs: int
    lastTimestampUtcMs: int
    sampleCount: int
    maxSampleGapMs: int | None = Field(description="Largest gap between adjacent raw samples; null if < 2 samples")


class SourceCoverageInterval(BaseModel):
    """Coverage of values[i + 1] - values[i], bounded by timestampsUtcMs[i] and timestampsUtcMs[i + 1]"""

    status: SourceCoverageIntervalStatus
    supportedStartUtcMs: int | None = Field(description="Start of common source support in the interval; null if none")
    supportedEndUtcMs: int | None = Field(description="End of common source support in the interval; null if none")


class VectorSourceCoverage(BaseModel):
    interpolationMethod: SourceCoverageInterpolationMethod
    sources: list[VectorSourceSummary]
    intervals: list[SourceCoverageInterval] = Field(
        description="One entry per adjacent pair of returned timestamps, i.e. max(len(timestampsUtcMs) - 1, 0) entries"
    )


class VectorRealizationData(BaseModel):
    realization: int
    timestampsUtcMs: list[int]
    values: list[float]
    unit: str
    isRate: bool
    derivedVectorInfo: DerivedVectorInfo | None = None
    sourceCoverage: VectorSourceCoverage | None = Field(
        default=None,
        exclude_if=lambda value: value is None,
        description=(
            "Raw-source support for the returned cumulative values. Only present when include_source_coverage=true. "
            "Describes provenance of the returned values, not simulation completeness or forecast horizon."
        ),
    )


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
