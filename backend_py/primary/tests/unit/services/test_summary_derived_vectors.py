import datetime
import re
import pytest

import pyarrow as pa

from primary.services.service_exceptions import InvalidDataError
from primary.services.summary_derived_vectors import (
    DerivedRealizationVector,
    DerivedVectorType,
    create_derived_realization_vector_list,
    create_derived_vector_unit,
    create_per_day_vector_table_pa,
    create_per_interval_vector_table_pa,
    create_per_day_vector_name,
    create_per_interval_vector_name,
    find_derived_vector_type,
    get_derived_vector_type,
    get_total_vector_name,
    is_total_vector,
    is_derived_vector,
    is_per_interval_vector,
    is_per_day_vector,
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


def test_create_per_interval_vector_table_pa_weekly_input():
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


def test_create_per_interval_vector_table_pa_monthly_input():
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


def test_create_per_interval_vector_table_pa_yearly_input():
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
    with pytest.raises(
        InvalidDataError, match=r"DATE column must be of type timestamp\(ms\), but got int32 \[service=general\]"
    ):
        create_per_interval_vector_table_pa(input_table)


def test_create_per_day_vector_table_pa_weekly_input():
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


def test_create_per_day_vector_table_pa_monthly_input():
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


def test_create_per_day_vector_table_pa_yearly_input():
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
    with pytest.raises(
        InvalidDataError, match=r"DATE column must be of type timestamp\(ms\), but got int32 \[service=general\]"
    ):
        create_per_day_vector_table_pa(input_table)


def test_create_derived_realization_vector_list():
    # Create a sample derived vector table
    derived_vector_table = pa.table(
        {
            "DATE": pa.array(
                [datetime.datetime(2021, 1, 1), datetime.datetime(2021, 1, 8), datetime.datetime(2021, 1, 15)] * 3,
                type=pa.timestamp("ms"),
            ),
            "REAL": pa.array([1, 1, 1, 2, 2, 2, 4, 4, 4], type=pa.int16()),
            "DERIVED_VECTOR": pa.array([10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0], type=pa.float32()),
        }
    )

    # Expected output list of DerivedRealizationVector
    expected_list = [
        DerivedRealizationVector(
            realization=1,
            timestamps_utc_ms=[1609459200000, 1610064000000, 1610668800000],
            values=[10.0, 20.0, 30.0],
            is_rate=False,
            unit="unit",
        ),
        DerivedRealizationVector(
            realization=2,
            timestamps_utc_ms=[1609459200000, 1610064000000, 1610668800000],
            values=[40.0, 50.0, 60.0],
            is_rate=False,
            unit="unit",
        ),
        DerivedRealizationVector(
            realization=4,
            timestamps_utc_ms=[1609459200000, 1610064000000, 1610668800000],
            values=[70.0, 80.0, 90.0],
            is_rate=False,
            unit="unit",
        ),
    ]

    is_rate = False

    # Call the function
    result_list = create_derived_realization_vector_list(derived_vector_table, "DERIVED_VECTOR", is_rate, "unit")

    # Assert the result
    assert result_list == expected_list


def test_create_derived_realization_vector_list_invalid_column_name():
    # Create a sample derived vector table with invalid column name
    derived_vector_table = pa.table(
        {
            "INVALID_DATE_NAME": pa.array(
                [datetime.datetime(2021, 1, 1), datetime.datetime(2021, 1, 8), datetime.datetime(2021, 1, 15)] * 3,
                type=pa.timestamp("ms"),
            ),
            "REAL": pa.array([1, 1, 1, 2, 2, 2, 4, 4, 4], type=pa.int16()),
            "DERIVED_VECTOR": pa.array([10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0], type=pa.float32()),
        }
    )

    is_rate = False

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError):
        create_derived_realization_vector_list(derived_vector_table, "DERIVED_VECTOR", is_rate, "unit")


def test_create_derived_realization_vector_list_invalid_column_type():
    # Create a sample derived vector table with invalid column type
    derived_vector_table = pa.table(
        {
            "DATE": pa.array([1, 2, 3, 4], type=pa.int32()),
            "REAL": pa.array([1, 1, 1, 1], type=pa.int16()),
            "DERIVED_VECTOR": pa.array([10.0, 20.0, 30.0, 40.0], type=pa.float32()),
        }
    )

    is_rate = False

    # Call the function and expect an InvalidDataError
    with pytest.raises(InvalidDataError):
        create_derived_realization_vector_list(derived_vector_table, "DERIVED_VECTOR", is_rate, "unit")


def test_get_total_vector_name_per_day():
    vector_name = "PER_DAY_TOTAL_VECTOR"
    expected_name = "TOTAL_VECTOR"
    assert get_total_vector_name(vector_name) == expected_name


def test_get_total_vector_name_per_interval():
    vector_name = "PER_INTVL_TOTAL_VECTOR"
    expected_name = "TOTAL_VECTOR"
    assert get_total_vector_name(vector_name) == expected_name


def test_get_total_vector_name_invalid():
    vector_name = "INVALID_TOTAL_VECTOR"
    with pytest.raises(
        InvalidDataError, match="Expected INVALID_TOTAL_VECTOR to be a derived PER_DAY or PER_INTVL vector!"
    ):
        get_total_vector_name(vector_name)


def test_is_total_vector_true():
    assert is_total_vector("WOPT") is True
    assert is_total_vector("WOPT:well") is True
    assert is_total_vector("GOPT:group") is True
    assert is_total_vector("FOPT:region") is True
    assert is_total_vector("WOPTH:well") is True  # Historical vector
    assert is_total_vector("GOPTH:group") is True  # Historical vector


def test_is_total_vector_false():
    assert is_total_vector("WOPR") is False
    assert is_total_vector("WOPR:well") is False
    assert is_total_vector("GOPR:group") is False
    assert is_total_vector("FOPR:region") is False
    assert is_total_vector("WOP:well") is False  # Less than 3 characters after removing leading character
    assert is_total_vector("GOP:group") is False  # Less than 3 characters after removing leading character


def test_is_total_vector_invalid_format():
    assert is_total_vector("OPT") is False  # Missing first character
    assert is_total_vector(":well") is False  # Empty vector base name
    assert is_total_vector("W:well") is False  # Less than 3 characters after removing leading character
    assert is_total_vector("") is False  # Empty string
    assert is_total_vector(":") is False  # Only delimiter


def test_create_derived_vector_unit_per_day():
    assert create_derived_vector_unit("m3", DerivedVectorType.PER_DAY) == "m3/DAY"


def test_create_derived_vector_unit_other():
    assert create_derived_vector_unit("m3", DerivedVectorType.PER_INTERVAL) == "m3"


def test_find_derived_vector_category_per_day():
    assert find_derived_vector_type("PER_DAY_VECTOR") == DerivedVectorType.PER_DAY


def test_find_derived_vector_category_per_interval():
    assert find_derived_vector_type("PER_INTVL_VECTOR") == DerivedVectorType.PER_INTERVAL


def test_find_derived_vector_category_none():
    assert find_derived_vector_type("OTHER_VECTOR") is None


def test_get_derived_vector_category_per_day():
    assert get_derived_vector_type("PER_DAY_VECTOR") == DerivedVectorType.PER_DAY


def test_get_derived_vector_category_per_interval():
    assert get_derived_vector_type("PER_INTVL_VECTOR") == DerivedVectorType.PER_INTERVAL


def test_get_derived_vector_category_none():
    with pytest.raises(
        InvalidDataError, match=re.escape("Expected OTHER_VECTOR to be a derived vector. [service=general]")
    ):
        get_derived_vector_type("OTHER_VECTOR")


def test_is_derived_vector_true():
    assert is_derived_vector("PER_DAY_VECTOR") is True
    assert is_derived_vector("PER_INTVL_VECTOR") is True


def test_is_derived_vector_false():
    assert is_derived_vector("OTHER_VECTOR") is False


def test_create_per_day_vector_name():
    assert create_per_day_vector_name("VECTOR") == "PER_DAY_VECTOR"


def test_create_per_interval_vector_name():
    assert create_per_interval_vector_name("VECTOR") == "PER_INTVL_VECTOR"


def test_is_per_interval_vector_true():
    assert is_per_interval_vector("PER_INTVL_VECTOR") is True


def test_is_per_interval_vector_false():
    assert is_per_interval_vector("PER_DAY_VECTOR") is False


def test_is_per_day_vector_true():
    assert is_per_day_vector("PER_DAY_VECTOR") is True


def test_is_per_day_vector_false():
    assert is_per_day_vector("PER_INTVL_VECTOR") is False
