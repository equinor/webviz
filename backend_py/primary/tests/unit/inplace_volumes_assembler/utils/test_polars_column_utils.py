import polars as pl
from primary.services.inplace_volumes_table_assembler._utils.polars_column_utils import is_invalid_column


def test_is_invalid_column_with_all_null() -> None:
    # Create a column with all null values
    col = pl.Series("test", [None, None, None])

    # Check that it's considered invalid
    assert is_invalid_column(col) is True


def test_is_invalid_column_with_some_values() -> None:
    # Create a column with some non-null values
    col = pl.Series("test", [1, None, 3])

    # Check that it's not considered invalid
    assert is_invalid_column(col) is False


def test_is_invalid_column_with_float_all_nan() -> None:
    # Create a float column with all NaN values
    col = pl.Series("test", [float("nan"), float("nan"), float("nan")])

    # Check that it's considered invalid
    assert is_invalid_column(col) is True


def test_is_invalid_column_with_float_some_values() -> None:
    # Create a float column with some non-NaN values
    col = pl.Series("test", [1.0, float("nan"), 3.0])

    # Check that it's not considered invalid
    assert is_invalid_column(col) is False


def test_is_invalid_column_with_non_float_nan_values() -> None:
    # Create a string column with "NaN" strings - these aren't actual NaN values
    col = pl.Series("test", ["NaN", "NaN", "NaN"])

    # Check that it's not considered invalid (since strings can't be NaN)
    assert is_invalid_column(col) is False


def test_is_invalid_column_with_empty_series() -> None:
    # Create an empty Series
    col = pl.Series("test", [], dtype=pl.Float64)

    # Empty series should be considered valid (the all() method returns True for empty iterables)
    assert is_invalid_column(col) is False
