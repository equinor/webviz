"""Raw-source support provenance for resampled cumulative vectors; not evidence of simulation completeness."""

from dataclasses import dataclass
from enum import StrEnum
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc

from webviz_services.service_exceptions import InvalidDataError, Service


class SourceCoverageIntervalStatus(StrEnum):
    SOURCE_ALIGNED = "SOURCE_ALIGNED"
    INTERPOLATED = "INTERPOLATED"
    PARTIAL = "PARTIAL"
    UNSUPPORTED = "UNSUPPORTED"


class SourceCoverageRole(StrEnum):
    REGULAR = "REGULAR"
    COMPARISON = "COMPARISON"
    REFERENCE = "REFERENCE"


class SourceCoverageInterpolationMethod(StrEnum):
    LINEAR = "LINEAR"


@dataclass(frozen=True)
class RawSourceSamples:
    """Validated raw sample timestamps (sorted, unique, UTC ms) for one realization; kept internal to the backend"""

    timestamps_utc_ms: np.ndarray

    @property
    def first_timestamp_utc_ms(self) -> int:
        return int(self.timestamps_utc_ms[0])

    @property
    def last_timestamp_utc_ms(self) -> int:
        return int(self.timestamps_utc_ms[-1])

    @property
    def sample_count(self) -> int:
        return len(self.timestamps_utc_ms)

    @property
    def max_sample_gap_ms(self) -> Optional[int]:
        if len(self.timestamps_utc_ms) < 2:
            return None
        return int(np.max(np.diff(self.timestamps_utc_ms)))


@dataclass(frozen=True)
class SourceSummary:
    role: SourceCoverageRole
    first_timestamp_utc_ms: int
    last_timestamp_utc_ms: int
    sample_count: int
    max_sample_gap_ms: Optional[int]


@dataclass(frozen=True)
class SourceCoverageInterval:
    status: SourceCoverageIntervalStatus
    supported_start_utc_ms: Optional[int]
    supported_end_utc_ms: Optional[int]


@dataclass(frozen=True)
class SourceCoverage:
    interpolation_method: SourceCoverageInterpolationMethod
    sources: List[SourceSummary]
    intervals: List[SourceCoverageInterval]


def validate_sorted_raw_vector_table_for_source_coverage(table: pa.Table, vector_name: str) -> None:
    """
    Validate a raw vector table that is sorted on REAL then DATE.
    Rejects null/non-finite samples and duplicate dates rather than dropping them.
    """
    for column_name in ["DATE", "REAL", vector_name]:
        null_count = table.column(column_name).null_count
        if null_count > 0:
            raise InvalidDataError(f"Column {column_name} contains {null_count} null value(s)", Service.SUMO)

    if table.num_rows == 0:
        return

    if not pc.all(pc.is_finite(table.column(vector_name))).as_py():
        raise InvalidDataError(f"Column {vector_name} contains non-finite value(s)", Service.SUMO)

    real_np = table.column("REAL").to_numpy()
    date_ms_np = table.column("DATE").to_numpy().astype(np.int64)
    same_real_mask = real_np[1:] == real_np[:-1]
    date_diffs_within_real = np.diff(date_ms_np)[same_real_mask]
    if np.any(date_diffs_within_real == 0):
        raise InvalidDataError(f"Duplicate DATE value(s) within a realization for {vector_name}", Service.SUMO)
    if np.any(date_diffs_within_real < 0):
        raise InvalidDataError(f"DATE values are not sorted within a realization for {vector_name}", Service.SUMO)
    if np.any(np.diff(real_np) < 0):
        raise InvalidDataError(f"Table is not sorted on REAL for {vector_name}", Service.SUMO)


def extract_raw_source_samples_per_realization(sorted_table: pa.Table) -> Dict[int, RawSourceSamples]:
    """Extract raw sample timestamps per realization from a validated table sorted on REAL then DATE"""
    real_np = sorted_table.column("REAL").to_numpy()
    date_ms_np = sorted_table.column("DATE").to_numpy().astype(np.int64)
    unique_reals, first_occurrence_idx, real_counts = np.unique(real_np, return_index=True, return_counts=True)

    ret_dict: Dict[int, RawSourceSamples] = {}
    for real, start_idx, count in zip(unique_reals, first_occurrence_idx, real_counts):
        ret_dict[int(real)] = RawSourceSamples(timestamps_utc_ms=date_ms_np[start_idx : start_idx + count].copy())

    return ret_dict


def _is_raw_sample(timestamps: np.ndarray, raw_sorted: np.ndarray) -> np.ndarray:
    idx = np.searchsorted(raw_sorted, timestamps)
    clipped_idx = np.minimum(idx, len(raw_sorted) - 1)
    return (idx < len(raw_sorted)) & (raw_sorted[clipped_idx] == timestamps)


def classify_source_coverage_intervals(
    output_timestamps_utc_ms: Sequence[int], required_sources: Sequence[RawSourceSamples]
) -> List[SourceCoverageInterval]:
    """
    Classify each interval between adjacent output timestamps against the common support of all required sources.
    Entry i describes values[i + 1] - values[i].
    """
    if not required_sources:
        raise ValueError("At least one required source is needed to classify coverage")

    ts = np.asarray(output_timestamps_utc_ms, dtype=np.int64)
    if len(ts) < 2:
        return []
    if np.any(np.diff(ts) <= 0):
        raise InvalidDataError("Output timestamps must be strictly increasing to classify coverage", Service.GENERAL)

    starts = ts[:-1]
    ends = ts[1:]
    support_lo = max(src.first_timestamp_utc_ms for src in required_sources)
    support_hi = min(src.last_timestamp_utc_ms for src in required_sources)

    overlap_start = np.maximum(starts, support_lo)
    overlap_end = np.minimum(ends, support_hi)
    has_overlap = overlap_end > overlap_start
    is_fully_supported = (starts >= support_lo) & (ends <= support_hi)

    is_aligned = np.ones(len(starts), dtype=bool)
    for src in required_sources:
        is_aligned &= _is_raw_sample(starts, src.timestamps_utc_ms) & _is_raw_sample(ends, src.timestamps_utc_ms)

    intervals: List[SourceCoverageInterval] = []
    for i in range(len(starts)):
        if not has_overlap[i]:
            intervals.append(SourceCoverageInterval(SourceCoverageIntervalStatus.UNSUPPORTED, None, None))
            continue

        if not is_fully_supported[i]:
            status = SourceCoverageIntervalStatus.PARTIAL
        elif is_aligned[i]:
            status = SourceCoverageIntervalStatus.SOURCE_ALIGNED
        else:
            status = SourceCoverageIntervalStatus.INTERPOLATED

        intervals.append(SourceCoverageInterval(status, int(overlap_start[i]), int(overlap_end[i])))

    return intervals


def create_source_coverage(
    output_timestamps_utc_ms: Sequence[int], role_and_source_list: Sequence[Tuple[SourceCoverageRole, RawSourceSamples]]
) -> SourceCoverage:
    sources = [
        SourceSummary(
            role=role,
            first_timestamp_utc_ms=src.first_timestamp_utc_ms,
            last_timestamp_utc_ms=src.last_timestamp_utc_ms,
            sample_count=src.sample_count,
            max_sample_gap_ms=src.max_sample_gap_ms,
        )
        for role, src in role_and_source_list
    ]
    intervals = classify_source_coverage_intervals(
        output_timestamps_utc_ms, [src for _role, src in role_and_source_list]
    )

    return SourceCoverage(
        interpolation_method=SourceCoverageInterpolationMethod.LINEAR, sources=sources, intervals=intervals
    )
