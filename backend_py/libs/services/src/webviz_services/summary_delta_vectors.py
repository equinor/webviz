from dataclasses import dataclass, replace

import pyarrow as pa
import pyarrow.compute as pc
import numpy as np

from webviz_services.sumo_access.source_coverage import RawDateRange
from webviz_services.utils.arrow_helpers import sort_table_on_real_then_date, validate_summary_vector_table_pa


@dataclass
class DeltaVectorMetadata:
    is_rate: bool
    unit: str


@dataclass
class RealizationDeltaVector:
    realization: int
    timestamps_utc_ms: list[int]
    values: list[float]
    is_rate: bool
    unit: str
    comparison_raw_date_range: RawDateRange | None = None
    reference_raw_date_range: RawDateRange | None = None


def create_delta_vector_table(
    comparison_vector_table: pa.Table, reference_vector_table: pa.Table, vector_name: str
) -> pa.Table:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Definition:

        delta_vector = comparison_vector - reference_vector

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Returns: A table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values, sorted on
    REAL then DATE like the tables from `SummaryAccess.get_vector_table_async()`.

    `Note`: Pre-processing of DATE-columns, e.g. resampling, should be done before calling this function.
    """
    validate_summary_vector_table_pa(comparison_vector_table, vector_name)
    validate_summary_vector_table_pa(reference_vector_table, vector_name)

    joined_vector_table = comparison_vector_table.join(
        reference_vector_table, keys=["DATE", "REAL"], join_type="inner", right_suffix="_reference"
    )
    delta_vector = pc.subtract(
        joined_vector_table.column(vector_name), joined_vector_table.column(f"{vector_name}_reference")
    )

    delta_table = pa.table(
        {
            "DATE": joined_vector_table.column("DATE"),
            "REAL": joined_vector_table.column("REAL"),
            vector_name: delta_vector,
        }
    )

    # The join gives no guaranteed row order
    return sort_table_on_real_then_date(delta_table)


def create_realization_delta_vector_list(
    delta_vector_table: pa.Table, vector_name: str, is_rate: bool, unit: str
) -> list[RealizationDeltaVector]:
    """
    Create a list of RealizationDeltaVector from a delta vector table sorted on REAL then DATE, as returned by
    `create_delta_vector_table()`.
    """
    validate_summary_vector_table_pa(delta_vector_table, vector_name)

    real_arr_np = delta_vector_table.column("REAL").to_numpy()
    unique_reals, first_occurrence_idx, real_counts = np.unique(real_arr_np, return_index=True, return_counts=True)

    whole_date_np_arr = delta_vector_table.column("DATE").to_numpy()
    whole_value_np_arr = delta_vector_table.column(vector_name).to_numpy()

    ret_arr: list[RealizationDeltaVector] = []
    for i, real in enumerate(unique_reals):
        start_row_idx = first_occurrence_idx[i]
        row_count = real_counts[i]
        date_np_arr = whole_date_np_arr[start_row_idx : start_row_idx + row_count]
        value_np_arr = whole_value_np_arr[start_row_idx : start_row_idx + row_count]

        ret_arr.append(
            RealizationDeltaVector(
                realization=real,
                timestamps_utc_ms=date_np_arr.astype(int).tolist(),
                values=value_np_arr.tolist(),
                is_rate=is_rate,
                unit=unit,
            )
        )

    return ret_arr


def add_raw_date_ranges_to_realization_delta_vectors(
    realization_delta_vectors: list[RealizationDeltaVector],
    comparison_raw_date_ranges_per_real: dict[int, RawDateRange],
    reference_raw_date_ranges_per_real: dict[int, RawDateRange],
) -> list[RealizationDeltaVector]:
    """
    Return copies of the delta vectors with the raw date ranges of both the comparison and the reference
    ensemble of the same realization attached.
    """
    return [
        replace(
            delta_vec,
            comparison_raw_date_range=comparison_raw_date_ranges_per_real[int(delta_vec.realization)],
            reference_raw_date_range=reference_raw_date_ranges_per_real[int(delta_vec.realization)],
        )
        for delta_vec in realization_delta_vectors
    ]
