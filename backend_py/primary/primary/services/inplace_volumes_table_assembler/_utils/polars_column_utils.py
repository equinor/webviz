import polars as pl


"""
This file contains general utility functions for polars column
"""


def is_invalid_column(col: pl.Series) -> bool:
    """
    Check if a column is invalid, i.e. all values are NaN or null.

    Args:
    - col (pl.Series): Polars Series to check

    Returns:
    - bool: True if the column is invalid, False otherwise
    """
    if col.is_null().all():
        return True
    if col.dtype in (pl.Float32, pl.Float64) and col.is_nan().all():
        return True
    return False
