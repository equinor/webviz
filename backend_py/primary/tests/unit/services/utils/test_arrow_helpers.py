import pytest
import pyarrow as pa
import numpy as np

from primary.services.service_exceptions import InvalidDataError, Service

from primary.services.utils.arrow_helpers import is_date_column_monotonically_increasing
from primary.services.utils.arrow_helpers import find_first_non_increasing_date_pair
from primary.services.utils.arrow_helpers import detect_missing_realizations
from primary.services.utils.arrow_helpers import validate_summary_vector_table_pa


def test_monotonically_increasing_date_util_functions() -> None:
    table_with_duplicate = pa.Table.from_pydict(
        {
            "DATE": [
                np.datetime64("2020-01-01", "ms"),
                np.datetime64("2020-01-02", "ms"),
                np.datetime64("2020-01-02", "ms"),
                np.datetime64("2020-01-03", "ms"),
                np.datetime64("2020-01-04", "ms"),
                np.datetime64("2020-01-04", "ms"),
            ],
        },
    )

    table_with_decrease = pa.Table.from_pydict(
        {
            "DATE": [
                np.datetime64("2020-01-01", "ms"),
                np.datetime64("2020-01-05", "ms"),
                np.datetime64("2020-01-04", "ms"),
                np.datetime64("2020-01-10", "ms"),
                np.datetime64("2020-01-15", "ms"),
                np.datetime64("2020-01-14", "ms"),
            ],
        },
    )

    assert not is_date_column_monotonically_increasing(table_with_duplicate)
    offending_pair = find_first_non_increasing_date_pair(table_with_duplicate)
    assert offending_pair[0] == np.datetime64("2020-01-02", "ms")
    assert offending_pair[1] == np.datetime64("2020-01-02", "ms")

    assert not is_date_column_monotonically_increasing(table_with_decrease)
    offending_pair = find_first_non_increasing_date_pair(table_with_decrease)
    assert offending_pair[0] == np.datetime64("2020-01-05", "ms")
    assert offending_pair[1] == np.datetime64("2020-01-04", "ms")


def test_detect_missing_realizations() -> None:
    table = pa.Table.from_pydict({"REAL": [1, 2, 3, 4, 6, 7, 8, 9]})

    missing_reals_list = detect_missing_realizations(table, required_reals_arr=pa.array([1, 2, 3, 4, 6, 7, 8, 9]))
    assert len(missing_reals_list) == 0

    missing_reals_list = detect_missing_realizations(table, required_reals_arr=pa.array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))
    assert len(missing_reals_list) == 2
    assert 0 in missing_reals_list
    assert 5 in missing_reals_list


def test_validate_summary_vector_table_pa_valid() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    try:
        validate_summary_vector_table_pa(table, vector_name)
    except InvalidDataError:
        pytest.fail("validate_summary_vector_table_pa raised InvalidDataError unexpectedly!")


def test_validate_summary_vector_table_pa_missing_column() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_unexpected_column() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0], "EXTRA": [10.0, 11.0, 12.0]}
    schema = pa.schema(
        [("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.float32()), ("EXTRA", pa.float32())]
    )
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_date_type() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.int32()), ("REAL", pa.int16()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_real_type() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4.0, 5.0, 6.0], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.float32()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_vector_type() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7, 8, 9]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.int32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_sumo_service() -> None:
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError) as excinfo:
        validate_summary_vector_table_pa(table, vector_name, Service.SUMO)
    assert excinfo.value.service == Service.SUMO
