import pyarrow as pa

from primary.services.service_exceptions import InvalidDataError, Service


def validate_summary_vector_table_pa(
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
