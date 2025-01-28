import datetime
import pytest

import pyarrow as pa

from primary.services.service_exceptions import InvalidDataError
from primary.services.summary_derived_vectors import (
    create_per_day_vector_table_pa,
    create_per_interval_vector_table_pa,
)

WEEKLY_TOTAL_VECTOR_TABLE = pa.table(
    {
        "DATE": pa.array(
            [datetime.datetime(2021, 1, 1), datetime.datetime(2021, 1, 8), datetime.datetime(2021, 1, 15)] * 3,
            type=pa.timestamp("ms"),
        ),
        "REAL": pa.array([1, 1, 1, 2, 2, 2, 4, 4, 4], type=pa.int16()),
        "TOTAL_VECTOR": pa.array([50.0, 100.0, 150.0, 300.0, 400.0, 500.0, 1000.0, 1200.0, 1400.0], type=pa.float32()),
    }
)

MONTHLY_TOTAL_VECTOR_TABLE = pa.table(
    {
        "DATE": pa.array(
            [datetime.datetime(2021, 1, 1), datetime.datetime(2021, 2, 1), datetime.datetime(2021, 3, 1)] * 3,
            type=pa.timestamp("ms"),
        ),
        "REAL": pa.array([1, 1, 1, 2, 2, 2, 4, 4, 4], type=pa.int16()),
        "TOTAL_VECTOR": pa.array([250.0, 500.0, 750.0, 300.0, 600.0, 900.0, 400.0, 750.0, 1100.0], type=pa.float32()),
    }
)

YEARLY_TOTAL_VECTOR_TABLE = pa.table(
    {
        "DATE": pa.array(
            [datetime.datetime(2021, 1, 1), datetime.datetime(2022, 1, 1), datetime.datetime(2023, 1, 1)] * 3,
            type=pa.timestamp("ms"),
        ),
        "REAL": pa.array([1, 1, 1, 2, 2, 2, 4, 4, 4], type=pa.int16()),
        "TOTAL_VECTOR": pa.array(
            [500.0, 1000.0, 1500.0, 1000.0, 2000.0, 3000.0, 1500.0, 3000.0, 4500.0], type=pa.float32()
        ),
    }
)


def test_create_per_interval_vector_table_pa_WEEKLY_input():
    # Expected output table
    expected_table = pa.table(
        {
            "DATE": WEEKLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": WEEKLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "PER_INTVL_TOTAL_VECTOR": pa.array(
                [50.0, 50.0, 0.0, 100.0, 100.0, 0.0, 200.0, 200.0, 0.0], type=pa.float32()
            ),
        }
    )

    # Call the function
    result_table = create_per_interval_vector_table_pa(WEEKLY_TOTAL_VECTOR_TABLE).select(
        ["DATE", "REAL", "PER_INTVL_TOTAL_VECTOR"]
    )

    # Assert the result
    assert result_table.equals(expected_table)


def test_create_per_interval_vector_table_pa_MONTHLY_input():
    # Expected output table
    expected_table = pa.table(
        {
            "DATE": MONTHLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": MONTHLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "PER_INTVL_TOTAL_VECTOR": pa.array(
                [250.0, 250.0, 0.0, 300.0, 300.0, 0.0, 350.0, 350.0, 0.0], type=pa.float32()
            ),
        }
    )

    # Call the function
    result_table = create_per_interval_vector_table_pa(MONTHLY_TOTAL_VECTOR_TABLE).select(
        ["DATE", "REAL", "PER_INTVL_TOTAL_VECTOR"]
    )

    # Assert the result
    assert result_table.equals(expected_table)


def test_create_per_interval_vector_table_pa_YEARLY_input():
    # Expected output table
    expected_table = pa.table(
        {
            "DATE": YEARLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": YEARLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "PER_INTVL_TOTAL_VECTOR": pa.array(
                [500.0, 500.0, 0.0, 1000.0, 1000.0, 0.0, 1500.0, 1500.0, 0.0], type=pa.float32()
            ),
        }
    )

    # Call the function
    result_table = create_per_interval_vector_table_pa(YEARLY_TOTAL_VECTOR_TABLE).select(
        ["DATE", "REAL", "PER_INTVL_TOTAL_VECTOR"]
    )

    # Assert the result
    assert result_table.equals(expected_table)


def test_create_per_interval_vector_table_pa_missing_columns():
    # Create a sample input table with missing columnss
    input_table = pa.table({"DATE": pa.array([1, 2, 3, 4]), "REAL": pa.array([1, 1, 1, 1])})

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError, match="Table must contain at least 3 columns"):
        create_per_interval_vector_table_pa(input_table)


def test_create_per_interval_vector_table_pa_invalid_column_name():
    # Create a sample input table with invalid columns
    input_table = pa.table(
        {
            "INVALID_DATE_NAME": WEEKLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": WEEKLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "TOTAL_VECTOR": WEEKLY_TOTAL_VECTOR_TABLE.column("TOTAL_VECTOR"),
        }
    )

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError, match="Table must contain columns 'DATE' and 'REAL'"):
        create_per_interval_vector_table_pa(input_table)


def test_create_per_interval_vector_table_pa_invalid_column_type():
    # Create a sample input table with invalid column types
    data = {
        "DATE": pa.array([1, 2, 3, 4], type=pa.int32()),
        "REAL": pa.array([1, 1, 1, 1], type=pa.int16()),
        "TOTAL_VECTOR": pa.array([50.0, 100.0, 150.0, 200.0], type=pa.float32()),
    }
    input_table = pa.table(data)

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError, match="DATE column must be of type timestamp\(ms\)"):
        create_per_interval_vector_table_pa(input_table)


def test_create_per_day_vector_table_pa_WEEKLY_input():
    # Expected output table
    expected_table = pa.table(
        {
            "DATE": WEEKLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": WEEKLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "PER_DAY_TOTAL_VECTOR": pa.array(
                [50.0 / 7.0, 50.0 / 7.0, 0.0, 100.0 / 7.0, 100.0 / 7.0, 0.0, 200.0 / 7.0, 200.0 / 7.0, 0.0],
                type=pa.float32(),
            ),
        }
    )

    # Call the function
    result_table = create_per_day_vector_table_pa(WEEKLY_TOTAL_VECTOR_TABLE).select(
        ["DATE", "REAL", "PER_DAY_TOTAL_VECTOR"]
    )

    # Assert the result
    assert result_table.equals(expected_table)


def test_create_per_day_vector_table_pa_MONTHLY_input():
    # Expected output table
    expected_table = pa.table(
        {
            "DATE": MONTHLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": MONTHLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "PER_DAY_TOTAL_VECTOR": pa.array(
                [250.0 / 31.0, 250.0 / 28.0, 0.0, 300.0 / 31.0, 300.0 / 28.0, 0.0, 350.0 / 31.0, 350.0 / 28.0, 0.0],
                type=pa.float32(),
            ),
        }
    )

    # Call the function
    result_table = create_per_day_vector_table_pa(MONTHLY_TOTAL_VECTOR_TABLE).select(
        ["DATE", "REAL", "PER_DAY_TOTAL_VECTOR"]
    )

    # Assert the result
    assert result_table.equals(expected_table)


def test_create_per_day_vector_table_pa_YEARLY_input():
    # Expected output table
    expected_table = pa.table(
        {
            "DATE": YEARLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": YEARLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "PER_DAY_TOTAL_VECTOR": pa.array(
                [
                    500.0 / 365.0,
                    500.0 / 365.0,
                    0.0,
                    1000.0 / 365.0,
                    1000.0 / 365.0,
                    0.0,
                    1500.0 / 365.0,
                    1500.0 / 365.0,
                    0.0,
                ],
                type=pa.float32(),
            ),
        }
    )

    # Call the function
    result_table = create_per_day_vector_table_pa(YEARLY_TOTAL_VECTOR_TABLE).select(
        ["DATE", "REAL", "PER_DAY_TOTAL_VECTOR"]
    )

    # Assert the result
    assert result_table.equals(expected_table)


def test_create_per_day_vector_table_pa_missing_columns():
    # Create a sample input table with missing columns
    input_table = pa.table({"DATE": pa.array([1, 2, 3, 4]), "REAL": pa.array([1, 1, 1, 1])})

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError, match="Table must contain at least 3 columns"):
        create_per_day_vector_table_pa(input_table)


def test_create_per_day_vector_table_pa_invalid_column_name():
    # Create a sample input table with invalid columns
    input_table = pa.table(
        {
            "INVALID_DATE_NAME": WEEKLY_TOTAL_VECTOR_TABLE.column("DATE"),
            "REAL": WEEKLY_TOTAL_VECTOR_TABLE.column("REAL"),
            "TOTAL_VECTOR": WEEKLY_TOTAL_VECTOR_TABLE.column("TOTAL_VECTOR"),
        }
    )

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError, match="Table must contain columns 'DATE' and 'REAL'"):
        create_per_day_vector_table_pa(input_table)


def test_create_per_day_vector_table_pa_invalid_column_type():
    # Create a sample input table with invalid column types
    data = {
        "DATE": pa.array([1, 2, 3, 4], type=pa.int32()),
        "REAL": pa.array([1, 1, 1, 1], type=pa.int16()),
        "TOTAL_VECTOR": pa.array([50.0, 100.0, 150.0, 200.0], type=pa.float32()),
    }
    input_table = pa.table(data)

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError, match="DATE column must be of type timestamp\(ms\)"):
        create_per_day_vector_table_pa(input_table)
