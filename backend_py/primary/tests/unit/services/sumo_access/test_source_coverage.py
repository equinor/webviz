import numpy as np
import pyarrow as pa
import pytest

from webviz_services.service_exceptions import InvalidDataError
from webviz_services.sumo_access.source_coverage import (
    RawDateRange,
    extract_raw_date_range_per_realization,
    validate_sorted_raw_vector_table_for_source_coverage,
)


def _ms(date_str: str) -> int:
    return int(np.datetime64(date_str, "ms").astype(np.int64))


def _raw_date_range(first_date: str, last_date: str) -> RawDateRange:
    return RawDateRange(first_timestamp_utc_ms=_ms(first_date), last_timestamp_utc_ms=_ms(last_date))


def _make_raw_table(rows: list[tuple[str, int, float]]) -> pa.Table:
    """Create a raw FOPT table from (date, realization, value) rows, given sorted on realization then date"""
    schema = pa.schema([("DATE", pa.timestamp("ms")), ("REAL", pa.int16()), ("FOPT", pa.float32())])
    return pa.table(
        {
            "DATE": [np.datetime64(d, "ms") for d, _, _ in rows],
            "REAL": [r for _, r, _ in rows],
            "FOPT": [v for _, _, v in rows],
        },
        schema=schema,
    )


def test_extract_raw_date_range_per_realization() -> None:
    table = _make_raw_table(
        [
            ("2020-01-01", 3, 0.0),
            ("2020-02-15", 3, 45.0),
            ("2020-01-15", 5, 5.0),
            ("2020-03-01", 7, 0.0),
            ("2020-04-01", 7, 31.0),
            ("2020-05-01", 7, 61.0),
        ]
    )

    assert extract_raw_date_range_per_realization(table) == {
        3: _raw_date_range("2020-01-01", "2020-02-15"),
        5: _raw_date_range("2020-01-15", "2020-01-15"),
        7: _raw_date_range("2020-03-01", "2020-05-01"),
    }


def test_empty_table_is_valid_and_has_no_date_ranges() -> None:
    table = _make_raw_table([])

    validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")
    assert not extract_raw_date_range_per_realization(table)


def test_validation_accepts_declining_and_negative_values() -> None:
    table = _make_raw_table([("2020-01-01", 0, 100.0), ("2020-02-01", 0, 40.0), ("2020-03-01", 0, -20.0)])

    validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")
    assert extract_raw_date_range_per_realization(table) == {0: _raw_date_range("2020-01-01", "2020-03-01")}


@pytest.mark.parametrize(
    "rows",
    [
        pytest.param([("2020-01-01", 0, 0.0), ("2020-01-01", 0, 0.0)], id="duplicate-date-same-value"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-01-01", 0, 5.0)], id="duplicate-date"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-02-01", 0, float("nan"))], id="nan-value"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-02-01", 0, float("inf"))], id="inf-value"),
        pytest.param([("2020-02-01", 0, 0.0), ("2020-01-01", 0, 5.0)], id="dates-descending"),
        pytest.param([("2020-01-01", 1, 0.0), ("2020-01-01", 0, 0.0)], id="realizations-descending"),
    ],
)
def test_validation_rejects_malformed_values_and_unsorted_or_duplicate_dates(
    rows: list[tuple[str, int, float]],
) -> None:
    table = _make_raw_table(rows)

    with pytest.raises(InvalidDataError):
        validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")


@pytest.mark.parametrize("null_column", ["DATE", "REAL", "FOPT"])
def test_validation_rejects_nulls(null_column: str) -> None:
    table = _make_raw_table([("2020-01-01", 0, 0.0), ("2020-02-01", 0, 31.0)])
    idx = table.schema.get_field_index(null_column)
    null_arr = pa.array([table[null_column][0].as_py(), None], type=table.schema.field(null_column).type)
    table = table.set_column(idx, table.schema.field(null_column), null_arr)

    with pytest.raises(InvalidDataError):
        validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")
