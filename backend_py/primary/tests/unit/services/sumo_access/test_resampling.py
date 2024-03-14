import numpy as np
import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access._resampling import (
    Frequency,
    generate_normalized_sample_dates,
    interpolate_backfill,
    resample_segmented_multi_real_table,
    resample_single_real_table,
)


def _create_table_from_row_data(per_row_input_data: list, schema: pa.Schema) -> pa.Table:
    # Turn rows into columns
    columns_with_header = list(zip(*per_row_input_data))

    input_dict = {}
    for col in columns_with_header:
        colname = col[0]
        coldata = col[1:]
        input_dict[colname] = coldata

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

    schema = pa.schema(
        [
            pa.field("DATE", pa.timestamp("ms")),
            pa.field("T", pa.float32(), metadata={b"is_rate": b"False"}),
            pa.field("R", pa.float32(), metadata={b"is_rate": b"True"}),
        ]
    )

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

    schema = pa.schema(
        [
            pa.field("DATE", pa.timestamp("ms")),
            pa.field("REAL", pa.int64()),
            pa.field("T", pa.float32(), metadata={b"is_rate": b"False"}),
            pa.field("R", pa.float32(), metadata={b"is_rate": b"True"}),
        ]
    )

    raw_table = _create_table_from_row_data(per_row_input_data=input_data, schema=schema)
    res_table = resample_segmented_multi_real_table(raw_table, Frequency.DAILY)

    res_table_r1 = res_table.filter(pc.equal(res_table["REAL"], 1))
    res_table_r2 = res_table.filter(pc.equal(res_table["REAL"], 2))

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
    assert tot_arr_1[0] == tot_arr_1[0] == 10
    assert tot_arr_1[1] == tot_arr_1[1] == 20
    assert tot_arr_1[2] == tot_arr_1[2] == 30
    assert tot_arr_1[3] == tot_arr_1[3] == 40
    assert tot_arr_1[4] == tot_arr_1[4] == 50
    assert tot_arr_1[5] == tot_arr_1[5] == 60

    # Check backfill for the rate column
    rate_arr_1 = res_table_r1["R"].to_numpy()
    rate_arr_2 = res_table_r2["R"].to_numpy()
    assert rate_arr_1[0] == rate_arr_1[0] == 1
    assert rate_arr_1[1] == rate_arr_1[1] == 4
    assert rate_arr_1[2] == rate_arr_1[2] == 4
    assert rate_arr_1[3] == rate_arr_1[3] == 4
    assert rate_arr_1[4] == rate_arr_1[4] == 6
    assert rate_arr_1[5] == rate_arr_1[5] == 6
