import numpy as np
import pyarrow as pa
import pytest

from webviz_services.service_exceptions import InvalidDataError
from webviz_services.summary_delta_vectors import (
    add_source_coverage_to_realization_delta_vectors,
    create_delta_vector_table,
    create_realization_delta_vector_list,
    RealizationDeltaVector,
)
from webviz_services.sumo_access._resampling import resample_segmented_multi_real_table
from webviz_services.sumo_access.source_coverage import (
    RawSourceSamples,
    SourceCoverageIntervalStatus,
    SourceCoverageRole,
    extract_raw_source_samples_per_realization,
    validate_sorted_raw_vector_table_for_source_coverage,
)
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


# ---------------------------------------------------------------------------------------------------------------------
# Delta source coverage, classified on the final joined dates using both constituents
# ---------------------------------------------------------------------------------------------------------------------

ALIGNED = SourceCoverageIntervalStatus.SOURCE_ALIGNED
INTERP = SourceCoverageIntervalStatus.INTERPOLATED
PARTIAL = SourceCoverageIntervalStatus.PARTIAL
UNSUPP = SourceCoverageIntervalStatus.UNSUPPORTED


def _ms(date_str: str) -> int:
    return int(np.datetime64(date_str, "ms").astype(np.int64))


def _load_monthly_constituent(
    rows: list[tuple[str, int, float]], chunk_size: int | None = None
) -> tuple[pa.Table, dict[int, RawSourceSamples]]:
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
    if chunk_size is not None:
        raw = pa.concat_tables([raw.slice(i, chunk_size) for i in range(0, raw.num_rows, chunk_size)])
    table = sort_table_on_real_then_date(raw)
    validate_sorted_raw_vector_table_for_source_coverage(table, "vector")
    samples = extract_raw_source_samples_per_realization(table)
    return resample_segmented_multi_real_table(table, Frequency.MONTHLY), samples


def _delta_with_coverage(
    comparison_rows: list[tuple[str, int, float]], reference_rows: list[tuple[str, int, float]]
) -> list[RealizationDeltaVector]:
    comparison_table, comparison_samples = _load_monthly_constituent(comparison_rows)
    reference_table, reference_samples = _load_monthly_constituent(reference_rows)
    delta_table = create_delta_vector_table(comparison_table, reference_table, "vector")
    delta_list = create_realization_delta_vector_list(delta_table, "vector", is_rate=False, unit="SM3")
    return add_source_coverage_to_realization_delta_vectors(delta_list, comparison_samples, reference_samples)


def _single_delta_with_coverage(
    comparison_rows: list[tuple[str, int, float]], reference_rows: list[tuple[str, int, float]]
) -> RealizationDeltaVector:
    result = _delta_with_coverage(comparison_rows, reference_rows)
    assert len(result) == 1
    return result[0]


def _statuses_and_bounds(
    delta_vec: RealizationDeltaVector,
) -> list[tuple[SourceCoverageIntervalStatus, int | None, int | None]]:
    assert delta_vec.source_coverage is not None
    return [
        (iv.status, iv.supported_start_utc_ms, iv.supported_end_utc_ms) for iv in delta_vec.source_coverage.intervals
    ]


def test_delta_coverage_aligned() -> None:
    comparison = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 31.0), ("2020-03-01", 0, 60.0)]
    reference = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 10.0), ("2020-03-01", 0, 20.0)]
    delta = _single_delta_with_coverage(comparison, reference)

    assert delta.values == [0.0, 21.0, 40.0]
    assert _statuses_and_bounds(delta) == [
        (ALIGNED, _ms("2020-01-01"), _ms("2020-02-01")),
        (ALIGNED, _ms("2020-02-01"), _ms("2020-03-01")),
    ]
    assert delta.source_coverage is not None
    assert [s.role for s in delta.source_coverage.sources] == [
        SourceCoverageRole.COMPARISON,
        SourceCoverageRole.REFERENCE,
    ]


def test_delta_coverage_interpolated_when_one_constituent_lacks_boundary_sample() -> None:
    comparison = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 62.0), ("2020-03-01", 0, 120.0)]
    # 60 days from 1 Jan to 1 Mar 2020, so the interpolated 1 Feb reference value is 31
    reference = [("2020-01-01", 0, 0.0), ("2020-03-01", 0, 60.0)]
    delta = _single_delta_with_coverage(comparison, reference)

    assert delta.values == [0.0, 31.0, 60.0]
    assert [s for s, _, _ in _statuses_and_bounds(delta)] == [INTERP, INTERP]


def test_delta_coverage_partial_where_comparison_ends_before_reference() -> None:
    # Comparison ends 15 Feb, reference ends 1 Mar; both resampled grids contain 1 Mar
    comparison = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 100.0), ("2020-02-15", 0, 150.0)]
    reference = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 50.0), ("2020-03-01", 0, 80.0)]
    delta = _single_delta_with_coverage(comparison, reference)

    assert delta.timestamps_utc_ms == [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")]
    # Legacy subtraction is unchanged: (150 - 100) - (80 - 50) = 20 for February
    assert delta.values == [0.0, 50.0, 70.0]
    assert _statuses_and_bounds(delta) == [
        (ALIGNED, _ms("2020-01-01"), _ms("2020-02-01")),
        (PARTIAL, _ms("2020-02-01"), _ms("2020-02-15")),
    ]
    assert delta.source_coverage is not None
    comparison_src, reference_src = delta.source_coverage.sources
    assert (comparison_src.last_timestamp_utc_ms, comparison_src.sample_count) == (_ms("2020-02-15"), 3)
    assert (reference_src.last_timestamp_utc_ms, reference_src.sample_count) == (_ms("2020-03-01"), 3)


@pytest.mark.parametrize(
    ["comparison", "reference", "expected_timestamps"],
    [
        pytest.param(
            [("2020-01-03", 0, 1.0), ("2020-01-10", 0, 2.0)],
            [("2020-01-20", 0, 5.0), ("2020-01-28", 0, 9.0)],
            [_ms("2020-01-01"), _ms("2020-02-01")],
            id="disjoint-within-same-month",
        ),
        pytest.param(
            [("2020-01-01", 0, 0.0), ("2020-02-15", 0, 45.0)],
            [("2020-02-20", 0, 0.0), ("2020-04-01", 0, 41.0)],
            [_ms("2020-02-01"), _ms("2020-03-01")],
            id="disjoint-across-months",
        ),
    ],
)
def test_delta_coverage_disjoint_support_is_unsupported(
    comparison: list[tuple[str, int, float]],
    reference: list[tuple[str, int, float]],
    expected_timestamps: list[int],
) -> None:
    delta = _single_delta_with_coverage(comparison, reference)
    assert delta.timestamps_utc_ms == expected_timestamps
    assert _statuses_and_bounds(delta) == [(UNSUPP, None, None)]


def test_delta_coverage_identical_values_with_unequal_support() -> None:
    comparison = [("2020-01-01", 0, 0.0), ("2020-02-15", 0, 45.0)]
    reference = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 31.0), ("2020-02-15", 0, 45.0), ("2020-03-01", 0, 45.0)]
    delta = _single_delta_with_coverage(comparison, reference)

    # Zero delta values never establish coverage
    assert delta.values == [0.0, 0.0, 0.0]
    assert _statuses_and_bounds(delta) == [
        (INTERP, _ms("2020-01-01"), _ms("2020-02-01")),
        (PARTIAL, _ms("2020-02-01"), _ms("2020-02-15")),
    ]


def test_delta_coverage_swap_negates_values_and_swaps_roles_only() -> None:
    comparison = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 100.0), ("2020-02-15", 0, 150.0)]
    reference = [("2020-01-01", 0, 0.0), ("2020-02-01", 0, 50.0), ("2020-03-01", 0, 80.0)]
    forward = _single_delta_with_coverage(comparison, reference)
    swapped = _single_delta_with_coverage(reference, comparison)

    assert swapped.timestamps_utc_ms == forward.timestamps_utc_ms
    assert swapped.values == [-v for v in forward.values]
    assert _statuses_and_bounds(swapped) == _statuses_and_bounds(forward)
    assert forward.source_coverage is not None and swapped.source_coverage is not None
    fwd_cmp, fwd_ref = forward.source_coverage.sources
    swp_cmp, swp_ref = swapped.source_coverage.sources
    assert (swp_cmp.role, swp_ref.role) == (SourceCoverageRole.COMPARISON, SourceCoverageRole.REFERENCE)
    assert swp_cmp.last_timestamp_utc_ms == fwd_ref.last_timestamp_utc_ms
    assert swp_ref.last_timestamp_utc_ms == fwd_cmp.last_timestamp_utc_ms


def test_delta_coverage_is_per_realization_on_matched_realizations_only() -> None:
    comparison = [
        ("2020-01-01", 2, 0.0),
        ("2020-02-15", 2, 45.0),
        ("2020-01-01", 5, 0.0),
        ("2020-03-01", 5, 60.0),
        ("2020-01-01", 9, 0.0),
        ("2020-03-01", 9, 60.0),
    ]
    reference = [
        ("2020-01-01", 5, 0.0),
        ("2020-03-01", 5, 30.0),
        ("2020-01-01", 2, 0.0),
        ("2020-03-01", 2, 30.0),
    ]
    result = _delta_with_coverage(comparison, reference)

    assert [int(d.realization) for d in result] == [2, 5]
    by_real = {int(d.realization): d for d in result}
    assert [s for s, _, _ in _statuses_and_bounds(by_real[2])] == [INTERP, PARTIAL]
    assert [s for s, _, _ in _statuses_and_bounds(by_real[5])] == [INTERP, INTERP]


def test_delta_coverage_preserves_legacy_values_and_default_is_none() -> None:
    comparison_table, comparison_samples = _load_monthly_constituent([("2020-01-10", 1, 0.0), ("2020-03-20", 1, 70.0)])
    reference_table, reference_samples = _load_monthly_constituent([("2020-01-05", 1, 0.0), ("2020-03-25", 1, 30.0)])
    delta_table = create_delta_vector_table(comparison_table, reference_table, "vector")
    legacy = create_realization_delta_vector_list(delta_table, "vector", is_rate=False, unit="SM3")
    with_coverage = add_source_coverage_to_realization_delta_vectors(legacy, comparison_samples, reference_samples)

    assert all(vec.source_coverage is None for vec in legacy)
    assert [(v.realization, v.timestamps_utc_ms, v.values, v.unit, v.is_rate) for v in with_coverage] == [
        (v.realization, v.timestamps_utc_ms, v.values, v.unit, v.is_rate) for v in legacy
    ]


def test_delta_coverage_rejects_missing_constituent_samples() -> None:
    delta = RealizationDeltaVector(realization=3, timestamps_utc_ms=[1, 2], values=[0.0, 1.0], is_rate=False, unit="u")
    samples = {3: RawSourceSamples(timestamps_utc_ms=np.array([1, 2], dtype=np.int64))}
    with pytest.raises(InvalidDataError):
        add_source_coverage_to_realization_delta_vectors([delta], samples, {})


# ---------------------------------------------------------------------------------------------------------------------
# Row-order normalization before realization slicing
# ---------------------------------------------------------------------------------------------------------------------


def _scramble_rows(table: pa.Table, chunk_size: int = 2) -> pa.Table:
    """Deterministic interleaving permutation (odd rows reversed, then even rows) split into multiple chunks"""
    n = table.num_rows
    permutation = [i for i in range(n) if i % 2 == 1][::-1] + [i for i in range(n) if i % 2 == 0]
    shuffled = table.take(pa.array(permutation, type=pa.int64()))
    return pa.concat_tables([shuffled.slice(i, chunk_size) for i in range(0, n, chunk_size)])


def _as_tuples(vectors: list[RealizationDeltaVector]) -> list[tuple[int, list[int], list[float]]]:
    return [(int(v.realization), v.timestamps_utc_ms, v.values) for v in vectors]


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


def test_create_realization_delta_vector_list_with_chunked_rows() -> None:
    chunks = [
        pa.table({"DATE": [2, 1], "REAL": [7, 4], "vector": [72.0, 41.0]}, schema=VECTOR_TABLE_SCHEMA),
        pa.table({"DATE": [3], "REAL": [4], "vector": [43.0]}, schema=VECTOR_TABLE_SCHEMA),
        pa.table({"DATE": [1, 2], "REAL": [7, 4], "vector": [71.0, 42.0]}, schema=VECTOR_TABLE_SCHEMA),
    ]
    delta_vector_table = pa.concat_tables(chunks)
    assert delta_vector_table.column("REAL").num_chunks == 3

    result = create_realization_delta_vector_list(delta_vector_table, "vector", is_rate=True, unit="unit")

    assert _as_tuples(result) == [(4, [1, 2, 3], [41.0, 42.0, 43.0]), (7, [1, 2], [71.0, 72.0])]


def test_create_delta_vector_table_with_interleaved_chunked_inputs() -> None:
    comparison = pa.concat_tables(
        [
            pa.table({"DATE": [2, 1], "REAL": [5, 3], "vector": [52.0, 31.0]}, schema=VECTOR_TABLE_SCHEMA),
            pa.table({"DATE": [1, 2, 9], "REAL": [5, 3, 8], "vector": [51.0, 32.0, 99.0]}, schema=VECTOR_TABLE_SCHEMA),
        ]
    )
    reference = pa.table(
        {"DATE": [2, 2, 1, 1], "REAL": [3, 5, 5, 3], "vector": [2.0, 20.0, 10.0, 1.0]}, schema=VECTOR_TABLE_SCHEMA
    )

    delta_table = create_delta_vector_table(comparison, reference, "vector")
    result = create_realization_delta_vector_list(delta_table, "vector", is_rate=False, unit="unit")

    # comparison - reference per (REAL, DATE); REAL 8 has no reference and is dropped
    assert _as_tuples(result) == [(3, [1, 2], [30.0, 30.0]), (5, [1, 2], [41.0, 32.0])]


# Realistic multi-realization fixture: comparison cumulative grows 2/day and reference 1/day from 2020-01-01, so
# within common support the delta equals days since 2020-01-01. Raw rows are interleaved across realizations.
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
    # Comparison is held at 30 on 1 Jan and at 150 on 1 Apr outside its 16 Jan - 16 Mar support
    (
        3,
        [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01"), _ms("2020-04-01")],
        [30.0 - 0.0, 62.0 - 31.0, 120.0 - 60.0, 150.0 - 91.0],
    ),
    (11, [_ms("2020-02-01"), _ms("2020-03-01")], [31.0, 60.0]),
]
REALISTIC_EXPECTED_COVERAGE = {
    0: [(INTERP, _ms("2020-01-01"), _ms("2020-02-01")), (INTERP, _ms("2020-02-01"), _ms("2020-03-01"))],
    3: [
        (PARTIAL, _ms("2020-01-16"), _ms("2020-02-01")),
        (INTERP, _ms("2020-02-01"), _ms("2020-03-01")),
        (PARTIAL, _ms("2020-03-01"), _ms("2020-03-16")),
    ],
    11: [(ALIGNED, _ms("2020-02-01"), _ms("2020-03-01"))],
}


@pytest.mark.parametrize("scramble_joined_inputs", [False, True])
def test_delta_realistic_multi_realization_with_and_without_coverage(scramble_joined_inputs: bool) -> None:
    comparison_table, comparison_samples = _load_monthly_constituent(REALISTIC_COMPARISON_ROWS, chunk_size=2)
    reference_table, reference_samples = _load_monthly_constituent(REALISTIC_REFERENCE_ROWS, chunk_size=3)
    if scramble_joined_inputs:
        comparison_table = _scramble_rows(comparison_table, chunk_size=3)
        reference_table = _scramble_rows(reference_table, chunk_size=2)

    delta_table = create_delta_vector_table(comparison_table, reference_table, "vector")
    without_coverage = create_realization_delta_vector_list(
        _scramble_rows(delta_table) if scramble_joined_inputs else delta_table, "vector", is_rate=False, unit="SM3"
    )
    with_coverage = add_source_coverage_to_realization_delta_vectors(
        without_coverage, comparison_samples, reference_samples
    )

    assert _as_tuples(without_coverage) == REALISTIC_EXPECTED_VALUES
    assert all(v.source_coverage is None and v.unit == "SM3" and not v.is_rate for v in without_coverage)
    assert _as_tuples(with_coverage) == REALISTIC_EXPECTED_VALUES
    assert {int(v.realization): _statuses_and_bounds(v) for v in with_coverage} == REALISTIC_EXPECTED_COVERAGE

    real3 = next(v for v in with_coverage if int(v.realization) == 3)
    assert real3.source_coverage is not None
    assert [
        (s.role, s.first_timestamp_utc_ms, s.last_timestamp_utc_ms, s.sample_count, s.max_sample_gap_ms)
        for s in real3.source_coverage.sources
    ] == [
        (SourceCoverageRole.COMPARISON, _ms("2020-01-16"), _ms("2020-03-16"), 2, _ms("2020-03-16") - _ms("2020-01-16")),
        (SourceCoverageRole.REFERENCE, _ms("2020-01-01"), _ms("2020-04-01"), 2, _ms("2020-04-01") - _ms("2020-01-01")),
    ]
