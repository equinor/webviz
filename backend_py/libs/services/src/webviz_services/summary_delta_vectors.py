from dataclasses import dataclass, replace

import pyarrow as pa
import pyarrow.compute as pc
import numpy as np

from webviz_services.service_exceptions import InvalidDataError, Service
from webviz_services.sumo_access.source_coverage import (
    RawSourceSamples,
    SourceCoverage,
    SourceCoverageRole,
    create_source_coverage,
)
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
    source_coverage: SourceCoverage | None = None


def create_delta_vector_table(
    comparison_vector_table: pa.Table, reference_vector_table: pa.Table, vector_name: str
) -> pa.Table:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Definition:

        delta_vector = comparison_vector - reference_vector

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Returns: A table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values.

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

    return delta_table


def create_realization_delta_vector_list(
    delta_vector_table: pa.Table, vector_name: str, is_rate: bool, unit: str
) -> list[RealizationDeltaVector]:
    """
    Create a list of RealizationDeltaVector from the delta vector table.
    """
    validate_summary_vector_table_pa(delta_vector_table, vector_name)

    # Join/derived outputs have no guaranteed row order; slicing below requires contiguous, date-sorted REAL segments
    delta_vector_table = sort_table_on_real_then_date(delta_vector_table)

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


def add_source_coverage_to_realization_delta_vectors(
    realization_delta_vectors: list[RealizationDeltaVector],
    comparison_raw_samples_per_real: dict[int, RawSourceSamples],
    reference_raw_samples_per_real: dict[int, RawSourceSamples],
) -> list[RealizationDeltaVector]:
    """
    Return copies of the delta vectors with source coverage classified on each vector's final (joined) timestamps,
    requiring support from both the comparison and the reference source of the same realization.
    """
    ret_arr: list[RealizationDeltaVector] = []
    for delta_vec in realization_delta_vectors:
        real = int(delta_vec.realization)
        comparison_samples = comparison_raw_samples_per_real.get(real)
        reference_samples = reference_raw_samples_per_real.get(real)
        if comparison_samples is None or reference_samples is None:
            raise InvalidDataError(f"Missing raw source samples for delta realization {real}", Service.GENERAL)

        source_coverage = create_source_coverage(
            delta_vec.timestamps_utc_ms,
            [(SourceCoverageRole.COMPARISON, comparison_samples), (SourceCoverageRole.REFERENCE, reference_samples)],
        )
        ret_arr.append(replace(delta_vec, source_coverage=source_coverage))

    return ret_arr
