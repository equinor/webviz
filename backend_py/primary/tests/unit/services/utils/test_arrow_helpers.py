from primary.services.utils.arrow_helpers import is_date_column_monotonically_increasing
from primary.services.utils.arrow_helpers import find_first_non_increasing_date_pair
from primary.services.utils.arrow_helpers import detect_missing_realizations

import pyarrow as pa
import numpy as np


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
