import pyarrow as pa
import pyarrow.compute as pc

from primary.services.service_exceptions import InvalidDataError, Service


def is_valid_vector_table(vector_table: pa.Table, vector_name: str) -> bool:
    """
    Check if the vector table is valid.

    Expect the table to contain the following columns: DATE, REAL, vector_name.
    """
    expected_columns = {"DATE", "REAL", vector_name}
    if set(vector_table.column_names) != expected_columns:
        unexpected_columns = set(vector_table.column_names) - expected_columns
        raise InvalidDataError(f"Unexpected columns in table {unexpected_columns}", Service.SUMO)


def create_delta_vector_table(
    first_vector_table: pa.Table, second_vector_table: pa.Table, vector_name: str
) -> pa.Table:
    """
    Create a table with delta values of the requested vector name between the two input tables.

    Performs "inner join". Only obtain matching index ["DATE", "REAL"] - i.e "DATE"-"REAL" combination
    present in only one vector is neglected.

    Note: Pre-processing of DATE-columns, e.g. resampling, should be done before calling this function.

    `Returns` a table with columns ["DATE", "REAL", vector_name] where vector_name contains the delta values.
    """
    is_valid_vector_table(first_vector_table, vector_name)
    is_valid_vector_table(second_vector_table, vector_name)

    joined_vector_table = first_vector_table.join(
        second_vector_table, keys=["DATE", "REAL"], join_type="inner", right_suffix="_second"
    )
    delta_vector = pc.subtract(
        joined_vector_table.column(vector_name), joined_vector_table.column(f"{vector_name}_second")
    )
    delta_table = pa.table(
        {
            "DATE": joined_vector_table.column("DATE"),
            "REAL": joined_vector_table.column("REAL"),
            vector_name: delta_vector,
        }
    )

    return delta_table
