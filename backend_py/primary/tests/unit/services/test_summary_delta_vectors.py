import numpy as np
import pyarrow as pa
import pytest


from webviz_services.summary_delta_vectors import (
    add_raw_date_ranges_to_realization_delta_vectors,
    create_delta_vector_table,
    create_realization_delta_vector_list,
    RealizationDeltaVector,
)
from webviz_services.sumo_access.source_coverage import RawDateRange
from webviz_services.sumo_access.summary_access import validate_and_resample_with_raw_date_ranges
from webviz_services.sumo_access.summary_types import Frequency
from webviz_services.utils.arrow_helpers import sort_table_on_real_then_date

VECTOR_TABLE_FIELDS: list[tuple[str, pa.DataType]] = [
    ("DATE", pa.timestamp("ms")),
    ("REAL", pa.int16()),
    ("vector", pa.float32()),
]

VECTOR_TABLE_SCHEMA = pa.schema(VECTOR_TABLE_FIELDS)


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


def test_create_realization_delta_vector_list_with_interleaved_rows() -> None:
    delta_data = {
        "DATE": [30, 10, 10, 30, 20, 20],
        "REAL": [2, 1, 2, 1, 2, 1],
        "vector": [300.0, 10.0, 100.0, 30.0, 200.0, 20.0],
    }
    delta_vector_table = pa.table(delta_data, schema=VECTOR_TABLE_SCHEMA)

    result = create_realization_delta_vector_list(delta_vector_table, "vector", is_rate=False, unit="unit")

    assert result == [
        RealizationDeltaVector(
            realization=1, timestamps_utc_ms=[10, 20, 30], values=[10.0, 20.0, 30.0], is_rate=False, unit="unit"
        ),
        RealizationDeltaVector(
            realization=2, timestamps_utc_ms=[10, 20, 30], values=[100.0, 200.0, 300.0], is_rate=False, unit="unit"
        ),
    ]


def _ms(date_str: str) -> int:
    return int(np.datetime64(date_str, "ms").astype(np.int64))


def _load_monthly_constituent(
    rows: list[tuple[str, int, float]], chunk_size: int
) -> tuple[pa.Table, dict[int, RawDateRange]]:
    schema = pa.schema(
        [
            pa.field("DATE", pa.timestamp("ms")),
            pa.field("REAL", pa.int16()),
            pa.field("vector", pa.float32(), metadata={b"is_rate": b"False"}),
        ]
    )
    raw = pa.table(
        {
            "DATE": [np.datetime64(d, "ms") for d, _, _ in rows],
            "REAL": [r for _, r, _ in rows],
            "vector": [v for _, _, v in rows],
        },
        schema=schema,
    )
    raw = pa.concat_tables([raw.slice(i, chunk_size) for i in range(0, raw.num_rows, chunk_size)])
    return validate_and_resample_with_raw_date_ranges(sort_table_on_real_then_date(raw), "vector", Frequency.MONTHLY)


def _expected_ranges(
    comparison_dates: tuple[str, str], reference_dates: tuple[str, str]
) -> tuple[RawDateRange, RawDateRange]:
    """Expected (comparison, reference) ranges from the first and last raw sample dates of each ensemble"""
    return (
        RawDateRange(_ms(comparison_dates[0]), _ms(comparison_dates[1])),
        RawDateRange(_ms(reference_dates[0]), _ms(reference_dates[1])),
    )


def _scramble_rows(table: pa.Table, chunk_size: int = 2) -> pa.Table:
    """Deterministic interleaving permutation (odd rows reversed, then even rows) split into multiple chunks"""
    n = table.num_rows
    permutation = [i for i in range(n) if i % 2 == 1][::-1] + [i for i in range(n) if i % 2 == 0]
    shuffled = table.take(pa.array(permutation, type=pa.int64()))
    return pa.concat_tables([shuffled.slice(i, chunk_size) for i in range(0, n, chunk_size)])


def _as_tuples(vectors: list[RealizationDeltaVector]) -> list[tuple[int, list[int], list[float]]]:
    return [(int(v.realization), v.timestamps_utc_ms, v.values) for v in vectors]


# Comparison cumulative grows 2/day and reference 1/day from 2020-01-01, so within the common range the delta equals
# days since 2020-01-01. Raw rows are interleaved across realizations.
REALISTIC_COMPARISON_ROWS = [
    ("2020-01-01", 0, 0.0),
    ("2020-01-16", 3, 30.0),
    ("2020-02-01", 11, 62.0),
    ("2020-01-01", 12, 0.0),
    ("2020-02-01", 0, 62.0),
    ("2020-03-16", 3, 150.0),
    ("2020-03-01", 11, 120.0),
    ("2020-03-01", 12, 120.0),
    ("2020-03-01", 0, 120.0),
]
REALISTIC_REFERENCE_ROWS = [
    ("2020-04-01", 3, 91.0),
    ("2020-01-01", 20, 0.0),
    ("2020-03-01", 0, 60.0),
    ("2020-03-01", 11, 60.0),
    ("2020-01-01", 3, 0.0),
    ("2020-02-01", 11, 31.0),
    ("2020-01-01", 0, 0.0),
    ("2020-03-01", 20, 60.0),
]
REALISTIC_EXPECTED_VALUES = [
    (0, [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")], [0.0, 31.0, 60.0]),
    # Comparison is held at 30 on 1 Jan and at 150 on 1 Apr outside its 16 Jan - 16 Mar range
    (
        3,
        [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01"), _ms("2020-04-01")],
        [30.0 - 0.0, 62.0 - 31.0, 120.0 - 60.0, 150.0 - 91.0],
    ),
    (11, [_ms("2020-02-01"), _ms("2020-03-01")], [31.0, 60.0]),
]
REALISTIC_EXPECTED_SOURCE_RANGES = {
    0: _expected_ranges(("2020-01-01", "2020-03-01"), ("2020-01-01", "2020-03-01")),
    3: _expected_ranges(("2020-01-16", "2020-03-16"), ("2020-01-01", "2020-04-01")),
    11: _expected_ranges(("2020-02-01", "2020-03-01"), ("2020-02-01", "2020-03-01")),
}


@pytest.mark.parametrize("scramble_joined_inputs", [False, True])
def test_delta_realistic_multi_realization_with_and_without_coverage(scramble_joined_inputs: bool) -> None:
    comparison_table, comparison_raw_date_ranges = _load_monthly_constituent(REALISTIC_COMPARISON_ROWS, chunk_size=2)
    reference_table, reference_raw_date_ranges = _load_monthly_constituent(REALISTIC_REFERENCE_ROWS, chunk_size=3)
    if scramble_joined_inputs:
        comparison_table = _scramble_rows(comparison_table, chunk_size=3)
        reference_table = _scramble_rows(reference_table, chunk_size=2)

    delta_table = create_delta_vector_table(comparison_table, reference_table, "vector")
    without_coverage = create_realization_delta_vector_list(
        _scramble_rows(delta_table) if scramble_joined_inputs else delta_table, "vector", is_rate=False, unit="SM3"
    )
    with_coverage = add_raw_date_ranges_to_realization_delta_vectors(
        without_coverage, comparison_raw_date_ranges, reference_raw_date_ranges
    )

    assert _as_tuples(without_coverage) == REALISTIC_EXPECTED_VALUES
    assert all(
        v.comparison_raw_date_range is None and v.reference_raw_date_range is None and v.unit == "SM3" and not v.is_rate
        for v in without_coverage
    )
    assert _as_tuples(with_coverage) == REALISTIC_EXPECTED_VALUES
    assert {
        int(v.realization): (v.comparison_raw_date_range, v.reference_raw_date_range) for v in with_coverage
    } == REALISTIC_EXPECTED_SOURCE_RANGES
