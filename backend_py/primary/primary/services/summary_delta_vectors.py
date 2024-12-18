from dataclasses import dataclass

import pyarrow as pa
import pyarrow.compute as pc
import numpy as np

from primary.services.service_exceptions import InvalidDataError, Service


@dataclass
class RealizationDeltaVector:
    realization: int
    timestamps_utc_ms: list[int]
    values: list[float]
    is_rate: bool
    unit: str


def _validate_summary_vector_table_pa(
    vector_table: pa.Table, vector_name: str, service: Service = Service.GENERAL
) -> None:
    """
    Check if the pyarrow vector table is valid.

    Expect the pyarrow single vector table to contain the following columns: DATE, REAL, vector_name.

    Raises InvalidDataError if the table does not contain the expected columns.
    """
    expected_columns = {"DATE", "REAL", vector_name}
    actual_columns = set(vector_table.column_names)
    if actual_columns != expected_columns:
        unexpected_columns = actual_columns - expected_columns
        raise InvalidDataError(f"Unexpected columns in table {unexpected_columns}", service)

    # Validate table column types
    if vector_table.field("DATE").type != pa.timestamp("ms"):
        raise InvalidDataError(
            f'DATE column must be of type timestamp(ms), but got {vector_table.field("DATE").type}', service
        )
    if vector_table.field("REAL").type != pa.int16():
        raise InvalidDataError("REAL column must be of type int16", service)
    if vector_table.field(vector_name).type != pa.float32():
        raise InvalidDataError(f"{vector_name} column must be of type float32", service)


def create_delta_vector_table(
    compare_vector_table: pa.Table, reference_vector_table: pa.Table, vector_name: str
) -> pa.Table:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Definition:

        delta_vector = compare_vector - reference_vector

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Returns: A table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values.

    `Note`: Pre-processing of DATE-columns, e.g. resampling, should be done before calling this function.
    """
    _validate_summary_vector_table_pa(compare_vector_table, vector_name)
    _validate_summary_vector_table_pa(reference_vector_table, vector_name)

    joined_vector_table = compare_vector_table.join(
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
    _validate_summary_vector_table_pa(delta_vector_table, vector_name)

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
