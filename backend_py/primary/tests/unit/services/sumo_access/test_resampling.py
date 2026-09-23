import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
import pytest

from webviz_services.service_exceptions import InvalidDataError
from webviz_services.sumo_access._resampling import (
    Frequency,
    generate_normalized_sample_dates,
    interpolate_backfill,
    resample_segmented_multi_real_table,
    resample_single_real_table,
)
from webviz_services.sumo_access.source_coverage import (
    RawSourceSamples,
    SourceCoverage,
    SourceCoverageInterpolationMethod,
    SourceCoverageIntervalStatus,
    SourceCoverageRole,
    classify_source_coverage_intervals,
    create_source_coverage,
    extract_raw_source_samples_per_realization,
    validate_sorted_raw_vector_table_for_source_coverage,
)
from webviz_services.utils.arrow_helpers import sort_table_on_real_then_date


def _create_table_from_row_data(per_row_input_data: list, schema: pa.Schema) -> pa.Table:
    # Turn rows into columns
    columns_with_header = list(zip(*per_row_input_data))

    input_dict: dict[str, list] = {}
    for col in columns_with_header:
        colname = col[0]
        coldata = col[1:]
        input_dict[colname] = list(coldata)

    table = pa.Table.from_pydict(input_dict, schema=schema)

    return table


def test_generate_sample_dates_daily() -> None:
    dates = generate_normalized_sample_dates(np.datetime64("2020-12-30"), np.datetime64("2021-01-05"), Frequency.DAILY)
    assert len(dates) == 7
    assert dates[0] == np.datetime64("2020-12-30")
    assert dates[-1] == np.datetime64("2021-01-05")

    dates = generate_normalized_sample_dates(
        np.datetime64("2020-12-30T01:30"), np.datetime64("2021-01-05T02:30"), Frequency.DAILY
    )
    assert len(dates) == 8
    assert dates[0] == np.datetime64("2020-12-30")
    assert dates[-1] == np.datetime64("2021-01-06")


def test_generate_sample_dates_weekly() -> None:
    # Mondays
    #   2020-12-21
    #   2020-12-28
    #   2021-01-04
    #   2021-01-11

    dates = generate_normalized_sample_dates(np.datetime64("2020-12-28"), np.datetime64("2021-01-11"), Frequency.WEEKLY)
    assert len(dates) == 3
    assert dates[0] == np.datetime64("2020-12-28")
    assert dates[-1] == np.datetime64("2021-01-11")

    dates = generate_normalized_sample_dates(
        np.datetime64("2020-12-27T00:01"), np.datetime64("2021-01-05T02:30"), Frequency.WEEKLY
    )
    assert len(dates) == 4
    assert dates[0] == np.datetime64("2020-12-21")
    assert dates[-1] == np.datetime64("2021-01-11")


def test_generate_sample_dates_monthly() -> None:
    dates = generate_normalized_sample_dates(
        np.datetime64("2020-12-01"), np.datetime64("2021-01-01"), Frequency.MONTHLY
    )
    assert len(dates) == 2
    assert dates[0] == np.datetime64("2020-12-01")
    assert dates[-1] == np.datetime64("2021-01-01")

    dates = generate_normalized_sample_dates(
        np.datetime64("2020-12-30"), np.datetime64("2022-01-01T01:01"), Frequency.MONTHLY
    )
    assert len(dates) == 15
    assert dates[0] == np.datetime64("2020-12-01")
    assert dates[-1] == np.datetime64("2022-02-01")


def test_generate_sample_dates_yearly() -> None:
    dates = generate_normalized_sample_dates(np.datetime64("2020-01-01"), np.datetime64("2020-01-02"), Frequency.YEARLY)
    assert len(dates) == 2
    assert dates[0] == np.datetime64("2020-01-01")
    assert dates[-1] == np.datetime64("2021-01-01")

    dates = generate_normalized_sample_dates(np.datetime64("2020-01-01"), np.datetime64("2022-01-01"), Frequency.YEARLY)
    assert len(dates) == 3
    assert dates[0] == np.datetime64("2020-01-01")
    assert dates[-1] == np.datetime64("2022-01-01")

    dates = generate_normalized_sample_dates(
        np.datetime64("2020-12-30"), np.datetime64("2022-01-01T01:01"), Frequency.YEARLY
    )
    assert len(dates) == 4
    assert dates[0] == np.datetime64("2020-01-01")
    assert dates[-1] == np.datetime64("2023-01-01")


def test_interpolate_backfill() -> None:
    raw_x = np.array([0, 2, 4, 6])
    raw_y = np.array([0, 20, 40, 60])

    x = np.array([0, 2, 4, 6])
    y = interpolate_backfill(x, raw_x, raw_y, -99, 99)
    assert (y == raw_y).all()

    x = np.array([-1, 1, 5, 7])
    expected_y = np.array([-99, 20, 60, 99])
    y = interpolate_backfill(x, raw_x, raw_y, -99, 99)
    assert (y == expected_y).all()

    x = np.array([-2, -1, 0, 3, 3, 6, 7, 8])
    expected_y = np.array([-99, -99, 0, 40, 40, 60, 99, 99])
    y = interpolate_backfill(x, raw_x, raw_y, -99, 99)
    assert (y == expected_y).all()


def test_resample_single_real_table() -> None:
    # fmt:off
    input_data = [
        ["DATE",                             "T",      "R"],
        [np.datetime64("2020-01-01", "ms"),  10.0,     1.0],
        [np.datetime64("2020-01-04", "ms"),  40.0,     4.0],
        [np.datetime64("2020-01-06", "ms"),  60.0,     6.0],
    ]
    # fmt:on

    fields: list[pa.Field] = [
        pa.field("DATE", pa.timestamp("ms")),
        pa.field("T", pa.float32(), metadata={b"is_rate": b"False"}),
        pa.field("R", pa.float32(), metadata={b"is_rate": b"True"}),
    ]

    schema = pa.schema(fields)

    raw_table = _create_table_from_row_data(per_row_input_data=input_data, schema=schema)
    res_table = resample_single_real_table(raw_table, Frequency.DAILY)

    date_arr = res_table["DATE"].to_numpy()
    assert date_arr[0] == np.datetime64("2020-01-01", "ms")
    assert date_arr[1] == np.datetime64("2020-01-02", "ms")
    assert date_arr[2] == np.datetime64("2020-01-03", "ms")
    assert date_arr[3] == np.datetime64("2020-01-04", "ms")
    assert date_arr[4] == np.datetime64("2020-01-05", "ms")
    assert date_arr[5] == np.datetime64("2020-01-06", "ms")

    # Check interpolation for the total column
    tot_arr = res_table["T"].to_numpy()
    assert tot_arr[0] == 10
    assert tot_arr[1] == 20
    assert tot_arr[2] == 30
    assert tot_arr[3] == 40
    assert tot_arr[4] == 50
    assert tot_arr[5] == 60

    # Check backfill for the rate column
    rate_arr = res_table["R"].to_numpy()
    assert rate_arr[0] == 1
    assert rate_arr[1] == 4
    assert rate_arr[2] == 4
    assert rate_arr[3] == 4
    assert rate_arr[4] == 6
    assert rate_arr[5] == 6


def test_resample_segmented_multi_real_table() -> None:
    # fmt:off
    input_data = [
        ["DATE",                            "REAL",  "T",      "R"],
        [np.datetime64("2020-01-01", "ms"),  1,      10.0,     1.0],
        [np.datetime64("2020-01-04", "ms"),  1,      40.0,     4.0],
        [np.datetime64("2020-01-06", "ms"),  1,      60.0,     6.0],
        [np.datetime64("2020-02-01", "ms"),  2,      10.0,     1.0],
        [np.datetime64("2020-02-04", "ms"),  2,      40.0,     4.0],
        [np.datetime64("2020-02-06", "ms"),  2,      60.0,     6.0],
    ]
    # fmt:on

    fields: list[pa.Field] = [
        pa.field("DATE", pa.timestamp("ms")),
        pa.field("REAL", pa.int64()),
        pa.field("T", pa.float32(), metadata={b"is_rate": b"False"}),
        pa.field("R", pa.float32(), metadata={b"is_rate": b"True"}),
    ]

    schema = pa.schema(fields)

    raw_table = _create_table_from_row_data(per_row_input_data=input_data, schema=schema)
    res_table = resample_segmented_multi_real_table(raw_table, Frequency.DAILY)

    res_table_r1 = res_table.filter(pc.equal(res_table["REAL"], pa.scalar(1)))
    res_table_r2 = res_table.filter(pc.equal(res_table["REAL"], pa.scalar(2)))

    date_arr_r1 = res_table_r1["DATE"].to_numpy()
    assert date_arr_r1[0] == np.datetime64("2020-01-01", "ms")
    assert date_arr_r1[1] == np.datetime64("2020-01-02", "ms")
    assert date_arr_r1[2] == np.datetime64("2020-01-03", "ms")
    assert date_arr_r1[3] == np.datetime64("2020-01-04", "ms")
    assert date_arr_r1[4] == np.datetime64("2020-01-05", "ms")
    assert date_arr_r1[5] == np.datetime64("2020-01-06", "ms")

    date_arr_r2 = res_table_r2["DATE"].to_numpy()
    assert date_arr_r2[0] == np.datetime64("2020-02-01", "ms")
    assert date_arr_r2[1] == np.datetime64("2020-02-02", "ms")
    assert date_arr_r2[2] == np.datetime64("2020-02-03", "ms")
    assert date_arr_r2[3] == np.datetime64("2020-02-04", "ms")
    assert date_arr_r2[4] == np.datetime64("2020-02-05", "ms")
    assert date_arr_r2[5] == np.datetime64("2020-02-06", "ms")

    # Check interpolation for the total column
    tot_arr_1 = res_table_r1["T"].to_numpy()
    tot_arr_2 = res_table_r2["T"].to_numpy()
    assert tot_arr_1[0] == tot_arr_2[0] == 10
    assert tot_arr_1[1] == tot_arr_2[1] == 20
    assert tot_arr_1[2] == tot_arr_2[2] == 30
    assert tot_arr_1[3] == tot_arr_2[3] == 40
    assert tot_arr_1[4] == tot_arr_2[4] == 50
    assert tot_arr_1[5] == tot_arr_2[5] == 60

    # Check backfill for the rate column
    rate_arr_1 = res_table_r1["R"].to_numpy()
    rate_arr_2 = res_table_r2["R"].to_numpy()
    assert rate_arr_1[0] == rate_arr_2[0] == 1
    assert rate_arr_1[1] == rate_arr_2[1] == 4
    assert rate_arr_1[2] == rate_arr_2[2] == 4
    assert rate_arr_1[3] == rate_arr_2[3] == 4
    assert rate_arr_1[4] == rate_arr_2[4] == 6
    assert rate_arr_1[5] == rate_arr_2[5] == 6


# ---------------------------------------------------------------------------------------------------------------------
# Source coverage for monthly resampled cumulative totals
# ---------------------------------------------------------------------------------------------------------------------

ALIGNED = SourceCoverageIntervalStatus.SOURCE_ALIGNED
INTERP = SourceCoverageIntervalStatus.INTERPOLATED
PARTIAL = SourceCoverageIntervalStatus.PARTIAL
UNSUPP = SourceCoverageIntervalStatus.UNSUPPORTED
DAY_MS = 86_400_000


def _ms(date_str: str) -> int:
    return int(np.datetime64(date_str, "ms").astype(np.int64))


def _make_total_table(rows: list[tuple[str, int, float]]) -> pa.Table:
    schema = pa.schema(
        [
            pa.field("DATE", pa.timestamp("ms")),
            pa.field("REAL", pa.int16()),
            pa.field("FOPT", pa.float32(), metadata={b"is_rate": b"False"}),
        ]
    )
    return pa.table(
        {
            "DATE": [np.datetime64(d, "ms") for d, _, _ in rows],
            "REAL": [r for _, r, _ in rows],
            "FOPT": [v for _, _, v in rows],
        },
        schema=schema,
    )


def _resample_monthly_with_coverage(raw_table: pa.Table) -> dict[int, tuple[list[int], list[float], SourceCoverage]]:
    """Real resampling path plus coverage captured from the same sorted raw table"""
    table = sort_table_on_real_then_date(raw_table)
    validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")
    raw_samples = extract_raw_source_samples_per_realization(table)
    res_table = resample_segmented_multi_real_table(table, Frequency.MONTHLY)

    ret: dict[int, tuple[list[int], list[float], SourceCoverage]] = {}
    for real, samples in raw_samples.items():
        real_table = res_table.filter(pc.equal(res_table["REAL"], pa.scalar(real, pa.int16())))
        ts = real_table["DATE"].to_numpy().astype(np.int64).tolist()
        values = real_table["FOPT"].to_numpy().tolist()
        ret[real] = (ts, values, create_source_coverage(ts, [(SourceCoverageRole.REGULAR, samples)]))
    return ret


def _statuses(coverage: SourceCoverage) -> list[SourceCoverageIntervalStatus]:
    return [interval.status for interval in coverage.intervals]


def _bounds(coverage: SourceCoverage) -> list[tuple[int | None, int | None]]:
    return [(iv.supported_start_utc_ms, iv.supported_end_utc_ms) for iv in coverage.intervals]


def test_source_coverage_exact_month_boundaries_with_terminal_january() -> None:
    raw = _make_total_table([("2020-11-01", 0, 0.0), ("2020-12-01", 0, 300.0), ("2021-01-01", 0, 610.0)])
    ts, values, cov = _resample_monthly_with_coverage(raw)[0]

    assert ts == [_ms("2020-11-01"), _ms("2020-12-01"), _ms("2021-01-01")]
    assert values == [0.0, 300.0, 610.0]
    # Terminal 1 January closes December; no January interval is invented
    assert len(cov.intervals) == len(ts) - 1 == 2
    assert _statuses(cov) == [ALIGNED, ALIGNED]
    assert _bounds(cov) == [(_ms("2020-11-01"), _ms("2020-12-01")), (_ms("2020-12-01"), _ms("2021-01-01"))]
    assert cov.interpolation_method == SourceCoverageInterpolationMethod.LINEAR
    src = cov.sources[0]
    assert (src.role, src.first_timestamp_utc_ms, src.last_timestamp_utc_ms) == (
        SourceCoverageRole.REGULAR,
        _ms("2020-11-01"),
        _ms("2021-01-01"),
    )
    assert (src.sample_count, src.max_sample_gap_ms) == (3, 31 * DAY_MS)


def test_source_coverage_interior_raw_sample_keeps_boundary_alignment() -> None:
    raw = _make_total_table([("2020-01-01", 0, 0.0), ("2020-01-11", 0, 100.0), ("2020-02-01", 0, 400.0)])
    ts, values, cov = _resample_monthly_with_coverage(raw)[0]

    assert ts == [_ms("2020-01-01"), _ms("2020-02-01")]
    assert values == [0.0, 400.0]
    assert _statuses(cov) == [ALIGNED]
    assert (cov.sources[0].sample_count, cov.sources[0].max_sample_gap_ms) == (3, 21 * DAY_MS)


def test_source_coverage_sparse_annual_samples_are_interpolated() -> None:
    # Cumulative grows by 1 per day through leap year 2020, so monthly increments equal days in month
    raw = _make_total_table([("2020-01-01", 0, 0.0), ("2021-01-01", 0, 366.0)])
    ts, values, cov = _resample_monthly_with_coverage(raw)[0]

    expected_days_in_month = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    assert len(ts) == 13
    assert np.allclose(np.diff(values), expected_days_in_month)
    assert _statuses(cov) == [INTERP] * 12
    assert _bounds(cov) == list(zip(ts[:-1], ts[1:]))
    assert (cov.sources[0].sample_count, cov.sources[0].max_sample_gap_ms) == (2, 366 * DAY_MS)


def test_source_coverage_partial_first_and_last_months_keep_values_and_conserve_increments() -> None:
    raw = _make_total_table(
        [("2020-01-16", 0, 0.0), ("2020-02-01", 0, 160.0), ("2020-03-01", 0, 450.0), ("2020-03-16", 0, 600.0)]
    )
    ts, values, cov = _resample_monthly_with_coverage(raw)[0]

    # Legacy resampling holds endpoint values on the padded 1 Jan and 1 Apr boundaries
    assert ts == [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01"), _ms("2020-04-01")]
    assert values == [0.0, 160.0, 450.0, 600.0]
    assert list(np.diff(values)) == [160.0, 290.0, 150.0]
    assert values[-1] - values[0] == 600.0 - 0.0

    assert _statuses(cov) == [PARTIAL, ALIGNED, PARTIAL]
    assert _bounds(cov) == [
        (_ms("2020-01-16"), _ms("2020-02-01")),
        (_ms("2020-02-01"), _ms("2020-03-01")),
        (_ms("2020-03-01"), _ms("2020-03-16")),
    ]


def test_source_coverage_does_not_change_resampled_values() -> None:
    raw = _make_total_table(
        [("2020-01-16", 1, 0.0), ("2020-02-10", 1, 250.0), ("2020-05-20", 1, 900.0), ("2020-06-15", 1, 1000.0)]
    )
    legacy = resample_segmented_multi_real_table(sort_table_on_real_then_date(raw), Frequency.MONTHLY)
    ts, values, _cov = _resample_monthly_with_coverage(raw)[1]

    assert ts == legacy["DATE"].to_numpy().astype(np.int64).tolist()
    assert values == legacy["FOPT"].to_numpy().tolist()


def test_source_coverage_unequal_endpoints_and_non_contiguous_realizations() -> None:
    raw = _make_total_table(
        [
            ("2020-03-01", 7, 0.0),
            ("2020-05-01", 7, 61.0),
            ("2020-01-01", 3, 0.0),
            ("2020-02-15", 3, 45.0),
        ]
    )
    result = _resample_monthly_with_coverage(raw)
    assert sorted(result.keys()) == [3, 7]

    ts3, _v3, cov3 = result[3]
    assert ts3 == [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")]
    assert _statuses(cov3) == [INTERP, PARTIAL]
    assert _bounds(cov3) == [(_ms("2020-01-01"), _ms("2020-02-01")), (_ms("2020-02-01"), _ms("2020-02-15"))]
    assert cov3.sources[0].last_timestamp_utc_ms == _ms("2020-02-15")

    ts7, _v7, cov7 = result[7]
    assert ts7 == [_ms("2020-03-01"), _ms("2020-04-01"), _ms("2020-05-01")]
    assert _statuses(cov7) == [INTERP, INTERP]
    assert cov7.sources[0].first_timestamp_utc_ms == _ms("2020-03-01")


def test_source_coverage_single_sample() -> None:
    mid_month = _resample_monthly_with_coverage(_make_total_table([("2020-01-15", 0, 5.0)]))[0]
    assert mid_month[1] == [5.0, 5.0]
    assert _statuses(mid_month[2]) == [UNSUPP]
    assert _bounds(mid_month[2]) == [(None, None)]
    assert mid_month[2].sources[0].sample_count == 1
    assert mid_month[2].sources[0].max_sample_gap_ms is None

    on_boundary = _resample_monthly_with_coverage(_make_total_table([("2020-01-01", 0, 5.0)]))[0]
    assert on_boundary[0] == [_ms("2020-01-01")]
    assert on_boundary[2].intervals == []


def test_source_coverage_unsorted_rows_are_sorted_before_capture() -> None:
    raw = _make_total_table([("2020-02-01", 0, 31.0), ("2020-01-01", 0, 0.0), ("2020-03-01", 0, 60.0)])
    ts, values, cov = _resample_monthly_with_coverage(raw)[0]
    assert ts == [_ms("2020-01-01"), _ms("2020-02-01"), _ms("2020-03-01")]
    assert values == [0.0, 31.0, 60.0]
    assert _statuses(cov) == [ALIGNED, ALIGNED]


def test_source_coverage_signed_declining_cumulative_is_not_rejected() -> None:
    raw = _make_total_table([("2020-01-01", 0, 100.0), ("2020-02-01", 0, 40.0), ("2020-03-01", 0, -20.0)])
    _ts, values, cov = _resample_monthly_with_coverage(raw)[0]
    assert values == [100.0, 40.0, -20.0]
    assert _statuses(cov) == [ALIGNED, ALIGNED]


def test_source_coverage_empty_table_produces_no_samples() -> None:
    table = _make_total_table([])
    validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")
    assert not extract_raw_source_samples_per_realization(table)


@pytest.mark.parametrize(
    "rows",
    [
        pytest.param([("2020-01-01", 0, 0.0), ("2020-01-01", 0, 0.0)], id="duplicate-date-same-value"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-01-01", 0, 5.0)], id="duplicate-date"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-02-01", 0, float("nan"))], id="nan-value"),
        pytest.param([("2020-01-01", 0, 0.0), ("2020-02-01", 0, float("inf"))], id="inf-value"),
    ],
)
def test_source_coverage_validation_rejects_malformed_values_and_dates(rows: list[tuple[str, int, float]]) -> None:
    table = sort_table_on_real_then_date(_make_total_table(rows))
    with pytest.raises(InvalidDataError):
        validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")


@pytest.mark.parametrize("null_column", ["DATE", "REAL", "FOPT"])
def test_source_coverage_validation_rejects_nulls(null_column: str) -> None:
    table = _make_total_table([("2020-01-01", 0, 0.0), ("2020-02-01", 0, 31.0)])
    idx = table.schema.get_field_index(null_column)
    null_arr = pa.array([table[null_column][0].as_py(), None], type=table.schema.field(null_column).type)
    table = table.set_column(idx, table.schema.field(null_column), null_arr)
    with pytest.raises(InvalidDataError):
        validate_sorted_raw_vector_table_for_source_coverage(table, "FOPT")


def test_classify_source_coverage_requires_increasing_output_timestamps() -> None:
    samples = RawSourceSamples(timestamps_utc_ms=np.array([_ms("2020-01-01"), _ms("2020-03-01")], dtype=np.int64))
    with pytest.raises(InvalidDataError):
        classify_source_coverage_intervals([_ms("2020-02-01"), _ms("2020-01-01")], [samples])
