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


def _is_valid_vector_table(vector_table: pa.Table, vector_name: str) -> bool:
    """
    Check if the vector table is valid.

    Expect the table to contain the following columns: DATE, REAL, vector_name.
    """
    expected_columns = {"DATE", "REAL", vector_name}
    if set(vector_table.column_names) != expected_columns:
        unexpected_columns = set(vector_table.column_names) - expected_columns
        raise InvalidDataError(f"Unexpected columns in table {unexpected_columns}", Service.GENERAL)


def create_delta_vector_table(
    first_vector_table: pa.Table, second_vector_table: pa.Table, vector_name: str
) -> pa.Table:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Returns: A table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values.

    `Note`: Pre-processing of DATE-columns, e.g. resampling, should be done before calling this function.
    """
    _is_valid_vector_table(first_vector_table, vector_name)
    _is_valid_vector_table(second_vector_table, vector_name)

    joined_vector_table = first_vector_table.join(
        second_vector_table, keys=["DATE", "REAL"], join_type="inner", right_suffix="_second"
    )
    delta_vector = pc.subtract(
        joined_vector_table.column(vector_name), joined_vector_table.column(f"{vector_name}_second")
    )

    # TODO: Should a schema be defined for the delta vector?
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
    _is_valid_vector_table(delta_vector_table, vector_name)

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
