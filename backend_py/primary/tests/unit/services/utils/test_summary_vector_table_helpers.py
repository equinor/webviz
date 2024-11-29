import pytest
import pyarrow as pa
from primary.services.service_exceptions import InvalidDataError, Service
from primary.services.utils.summary_vector_table_helpers import validate_summary_vector_table_pa


def test_validate_summary_vector_table_pa_valid():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    try:
        validate_summary_vector_table_pa(table, vector_name)
    except InvalidDataError:
        pytest.fail("validate_summary_vector_table_pa raised InvalidDataError unexpectedly!")


def test_validate_summary_vector_table_pa_missing_column():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_unexpected_column():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0], "EXTRA": [10.0, 11.0, 12.0]}
    schema = pa.schema(
        [("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.float32()), ("EXTRA", pa.float32())]
    )
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_date_type():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.int32()), ("REAL", pa.int16()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_real_type():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4.0, 5.0, 6.0], vector_name: [7.0, 8.0, 9.0]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.float32()), (vector_name, pa.float32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_invalid_vector_type():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6], vector_name: [7, 8, 9]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), (vector_name, pa.int32())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError):
        validate_summary_vector_table_pa(table, vector_name)


def test_validate_summary_vector_table_pa_sumo_service():
    vector_name = "VECTOR"
    data = {"DATE": [1, 2, 3], "REAL": [4, 5, 6]}
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16())])
    table = pa.Table.from_pydict(data, schema=schema)
    with pytest.raises(InvalidDataError) as excinfo:
        validate_summary_vector_table_pa(table, vector_name, Service.SUMO)
    assert excinfo.value.service == Service.SUMO
