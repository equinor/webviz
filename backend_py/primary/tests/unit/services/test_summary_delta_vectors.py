import pyarrow as pa


from primary.services.summary_delta_vectors import (
    create_delta_vector_table,
    create_realization_delta_vector_list,
    RealizationDeltaVector,
)


VECTOR_TABLE_SCHEMA = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), ("vector", pa.float32())])


def test_create_delta_vector_table() -> None:
    # Create sample data for comparison_vector_table
    comparison_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [10.0, 20.0, 30.0, 40.0]}
    comparison_vector_table = pa.table(comparison_data, schema=VECTOR_TABLE_SCHEMA)

    # Create sample data for reference_vector_table
    reference_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 15.0, 25.0, 35.0]}
    reference_vector_table = pa.table(reference_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected delta values
    expected_delta_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 5.0, 5.0, 5.0]}
    expected_delta_table = pa.table(expected_delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Call the function
    result_table = create_delta_vector_table(comparison_vector_table, reference_vector_table, "vector")

    # Validate the result
    assert result_table.equals(expected_delta_table)


def test_create_delta_vector_table_with_missing_dates() -> None:
    # Create sample data for comparison_vector_table
    comparison_data = {"DATE": [1, 2, 4], "REAL": [1, 1, 2], "vector": [10.0, 20.0, 40.0]}
    comparison_vector_table = pa.table(comparison_data, schema=VECTOR_TABLE_SCHEMA)

    # Create sample data for reference_vector_table
    reference_data = {"DATE": [1, 2, 3], "REAL": [1, 1, 2], "vector": [5.0, 15.0, 25.0]}
    reference_vector_table = pa.table(reference_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected delta values
    expected_delta_data = {"DATE": [1, 2], "REAL": [1, 1], "vector": [5.0, 5.0]}
    expected_delta_table = pa.table(expected_delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Call the function
    result_table = create_delta_vector_table(comparison_vector_table, reference_vector_table, "vector")

    # Validate the result
    assert result_table.equals(expected_delta_table)


def test_create_delta_vector_table_with_different_reals() -> None:
    # Create sample data for comparison_vector_table
    comparison_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 3], "vector": [10.0, 20.0, 30.0, 40.0]}
    comparison_vector_table = pa.table(comparison_data, schema=VECTOR_TABLE_SCHEMA)

    # Create sample data for reference_vector_table
    reference_data = {"DATE": [1, 2, 3, 4], "REAL": [1, 1, 2, 2], "vector": [5.0, 15.0, 25.0, 35.0]}
    reference_vector_table = pa.table(reference_data, schema=VECTOR_TABLE_SCHEMA)

    # Expected delta values
    expected_delta_data = {"DATE": [1, 2, 3], "REAL": [1, 1, 2], "vector": [5.0, 5.0, 5.0]}
    expected_delta_table = pa.table(expected_delta_data, schema=VECTOR_TABLE_SCHEMA)

    # Call the function
    result_table = create_delta_vector_table(comparison_vector_table, reference_vector_table, "vector")

    # Validate the result
    assert result_table.equals(expected_delta_table)


def test_create_realization_delta_vector_list() -> None:
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


def test_create_realization_delta_vector_list_with_single_real() -> None:
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


def test_create_realization_delta_vector_list_with_empty_table() -> None:
    # Create an empty delta_vector_table
    delta_vector_table = pa.table({"DATE": [], "REAL": [], "vector": []}, schema=VECTOR_TABLE_SCHEMA)

    # Expected result
    expected_result: list[RealizationDeltaVector] = []

    # Call the function
    result = create_realization_delta_vector_list(delta_vector_table, "vector", is_rate=True, unit="unit")

    # Validate the result
    assert result == expected_result
