import pyarrow as pa

from primary.services.service_exceptions import InvalidDataError, Service


def validate_summary_vector_table(vector_table: pa.Table, vector_name: str, service: Service = Service.GENERAL) -> None:
    """
    Check if the vector table is valid - single vector table should contain columns DATE, REAL, vector_name.

    Expect the pyarrow table to contain the following columns: DATE, REAL, vector_name.

    Raises InvalidDataError if the table does not contain the expected columns.
    """
    expected_columns = {"DATE", "REAL", vector_name}
    if set(vector_table.column_names) != expected_columns:
        unexpected_columns = set(vector_table.column_names) - expected_columns
        raise InvalidDataError(f"Unexpected columns in table {unexpected_columns}", service)
