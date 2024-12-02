import pytest
import pyarrow as pa

from primary.services.service_exceptions import InvalidDataError, Service
from primary.services.summary_delta_vectors import (
    create_delta_vector_table,
    create_realization_delta_vector_list,
    RealizationDeltaVector,
    _validate_summary_vector_table_pa,
)


VECTOR_TABLE_SCHEMA = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), ("vector", pa.float32())])


def test_create_delta_vector_table():
    # Create sample data for compare_vector_table
    compare_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [10.0, 20.0, 30.0, 40.0]}
    compare_vector_table = pa.table(compare_data, schema=VECTOR_TABLE_SCHEMA)

    # Create sample data for reference_vector_table
    reference_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 15.0, 25.0, 35.0]}
    reference_vector_table = pa.table(reference_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected delta values
    expected_delta_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 5.0, 5.0, 5.0]}
    expected_delta_table = pa.table(expected_delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Call the function
    result_table = create_delta_vector_table(compare_vector_table, reference_vector_table, "vector")

    # Validate the result
    assert result_table.equals(expected_delta_table)


def test_create_delta_vector_table_with_missing_dates():
    # Create sample data for compare_vector_table
    compare_data = {"DATE": [1, 2, 4], "REAL": [1, 1, 2], "vector": [10.0, 20.0, 40.0]}
    compare_vector_table = pa.table(compare_data, schema=VECTOR_TABLE_SCHEMA)

    # Create sample data for reference_vector_table
    reference_data = {"DATE": [1, 2, 3], "REAL": [1, 1, 2], "vector": [5.0, 15.0, 25.0]}
    reference_vector_table = pa.table(reference_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected delta values
    expected_delta_data = {"DATE": [1, 2], "REAL": [1, 1], "vector": [5.0, 5.0]}
    expected_delta_table = pa.table(expected_delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Call the function
    result_table = create_delta_vector_table(compare_vector_table, reference_vector_table, "vector")

    # Validate the result
    assert result_table.equals(expected_delta_table)


def test_create_delta_vector_table_with_different_reals():
    # Create sample data for compare_vector_table
    compare_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 3], "vector": [10.0, 20.0, 30.0, 40.0]}
    compare_vector_table = pa.table(compare_data, schema=VECTOR_TABLE_SCHEMA)

    # Create sample data for reference_vector_table
    reference_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 15.0, 25.0, 35.0]}
    reference_vector_table = pa.table(reference_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected delta values
    expected_delta_data = {"DATE": [1, 2, 3], "REAL": [1, 1, 2], "vector": [5.0, 5.0, 5.0]}
    expected_delta_table = pa.table(expected_delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Call the function
    result_table = create_delta_vector_table(compare_vector_table, reference_vector_table, "vector")

    # Validate the result
    assert result_table.equals(expected_delta_table)


def test_create_realization_delta_vector_list():
    # Create sample data for delta_vector_table
    delta_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 10.0, 15.0, 20.0]}
    delta_vector_table = pa.table(delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected result
    expected_result = [
        RealizationDeltaVector(realization=1, timestamps_utc_ms=[1, 2], values=[5.0, 10.0], is_rate=True, unit="unit"),
        RealizationDeltaVector(realization=2, timestamps_utc_ms=[3, 4], values=[15.0, 20.0], is_rate=True, unit="unit"),
    ]

    # Call the function
    result = create_realization_delta_vector_list(delta_vector_table, "vector", is_rate=True, unit="unit")

    # Validate the result
    assert result == expected_result


def test_create_realization_delta_vector_list_with_single_real():
    # Create sample data for delta_vector_table
    delta_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 1, 1], "vector": [5.0, 10.0, 15.0, 20.0]}
    delta_vector_table = pa.table(delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected result
    expected_result = [
        RealizationDeltaVector(
            realization=1, timestamps_utc_ms=[1, 2, 3, 4], values=[5.0, 10.0, 15.0, 20.0], is_rate=False, unit="unit"
        )
    ]

    # Call the function
    result = create_realization_delta_vector_list(delta_vector_table, "vector", is_rate=False, unit="unit")

    # Validate the result
    assert result == expected_result


def test_create_realization_delta_vector_list_with_empty_table():
    # Create an empty delta_vector_table
    delta_vector_table = pa.table({"DATE": [], "REAL": [], "vector": []}, schema=VECTOR_TABLE_SCHEMA)

    # Expected result
    expected_result = []

    # Call the function
    result = create_realization_delta_vector_list(delta_vector_table, "vector", is_rate=True, unit="unit")

    # Validate the result
    assert result == expected_result


def test_validate_summary_vector_table_pa_valid():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    try:
        _validate_summary_vector_table_pa(table, vector_name)
    except InvalidDataError:
        pytest.fail("validate_summary_vector_table_pa raised InvalidDataError unexpectedly!")


def test_validate_summary_vector_table_pa_missing_column():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        _validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_unexpected_column():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0], "EXTRA": [10.0, 11.0, 12.0]}
    schema = pa.schema(
        [("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.float32()), ("EXTRA", pa.float32())]
    )
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        _validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_date_type():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.int32()), ("REAL", pa.int16()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        _validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_real_type():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4.0, 5.0, 6.0], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.float32()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        _validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_vector_type():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7, 8, 9]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.int32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        _validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_sumo_service():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError) as excinfo:
        _validate_summary_vector_table_pa(table, vector_name, Service.SUMO)
    assert excinfo.value.service == Service.SUMO
