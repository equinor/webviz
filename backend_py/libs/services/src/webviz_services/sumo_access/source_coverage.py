"""Source coverage as date ranges: first and last raw (pre-resampling) sample date per realization of a vector"""

from dataclasses import dataclass
from typing import Dict

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc

from webviz_services.service_exceptions import InvalidDataError, InvalidParameterError, Service


class SourceCoverageUnsupportedError(InvalidParameterError):
    """Raised when source coverage is requested for a vector that is not a cumulative total"""


@dataclass(frozen=True)
class RawDateRange:
    """First and last validated raw sample timestamp (UTC ms) for one realization"""

    first_timestamp_utc_ms: int
    last_timestamp_utc_ms: int


def validate_sorted_raw_vector_table_for_source_coverage(table: pa.Table, vector_name: str) -> None:
    """
    Validate a raw vector table that must be sorted on REAL then DATE.
    Rejects null/non-finite samples, duplicate dates and unsorted rows rather than dropping or reordering them.
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
    if np.any(real_np[1:] < real_np[:-1]) or np.any(date_diffs_within_real < 0):
        raise InvalidDataError(f"Rows are not sorted on REAL then DATE for {vector_name}", Service.SUMO)
    if np.any(date_diffs_within_real == 0):
        raise InvalidDataError(f"Duplicate DATE value(s) within a realization for {vector_name}", Service.SUMO)


def extract_raw_date_range_per_realization(sorted_table: pa.Table) -> Dict[int, RawDateRange]:
    """Extract first and last raw sample timestamp per realization from a validated table sorted on REAL then DATE"""
    real_np = sorted_table.column("REAL").to_numpy()
    date_ms_np = sorted_table.column("DATE").to_numpy().astype(np.int64)
    unique_reals, first_occurrence_idx, real_counts = np.unique(real_np, return_index=True, return_counts=True)

    ret_dict: Dict[int, RawDateRange] = {}
    for real, start_idx, count in zip(unique_reals, first_occurrence_idx, real_counts):
        ret_dict[int(real)] = RawDateRange(
            first_timestamp_utc_ms=int(date_ms_np[start_idx]),
            last_timestamp_utc_ms=int(date_ms_np[start_idx + count - 1]),
        )

    return ret_dict
