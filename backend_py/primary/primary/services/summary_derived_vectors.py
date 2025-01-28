from dataclasses import dataclass

import numpy as np
import pyarrow as pa
import polars as pl

from primary.services.service_exceptions import InvalidDataError, Service
from primary.services.utils.arrow_helpers import validate_summary_vector_table_pa


@dataclass
class RealizationDerivedVector:
    realization: int
    timestamps_utc_ms: list[int]
    values: list[float]
    unit: str


# This code checks in a predefined list whether a certain WGNAMES
# variable represents a total accumulated quantity. Only the last three
# characters in the variable is considered (i.e. the leading 'W', 'G' or
# 'F' is discarded).
# Ref.: https://github.com/equinor/resdata/blob/f82318a84bbefb6a53ed674a04eb2a73d89de02d/lib/ecl/smspec_node.cpp#L332-L335
TOTAL_VARS = [
    "OPT",
    "GPT",
    "WPT",
    "GIT",
    "WIT",
    "OPTF",
    "OPTS",
    "OIT",
    "OVPT",
    "OVIT",
    "MWT",
    "WVPT",
    "WVIT",
    "GMT",
    "GPTF",
    "SGT",
    "GST",
    "FGT",
    "GCT",
    "GIMT",
    "WGPT",
    "WGIT",
    "EGT",
    "EXGT",
    "GVPT",
    "GVIT",
    "LPT",
    "VPT",
    "VIT",
    "NPT",
    "NIT",
    "CPT",
    "CIT",
]


def is_total_vector(vector_name: str, delimiter: str = ":") -> bool:
    """
    Check if a vector is a total vector.

    Provide vector name, which is vector base name (WOPT, WOPR, FOPT, GOPR, ...) and vector node name (well, group, region, etc)
    separated by delimiter.

    Based on `bool smspec_node_identify_total()` in resdata/lib/ecl/smspec_node.cpp:
    https://github.com/equinor/resdata/blob/f82318a84bbefb6a53ed674a04eb2a73d89de02d/lib/ecl/smspec_node.cpp#L315
    """

    split = vector_name.split(delimiter)
    if len(split) < 1:
        return False

    vector_base_name = split[0]
    if len(vector_base_name) < 1:
        return False

    # Do not include leading "W", "G" or "F" for comparison
    vector_base_substring = vector_base_name[1:]

    # All TOTAL_VARS element greater or equal to 3 characters
    if len(vector_base_substring) < 3:
        return False

    # Check if a total_var is substring of vector_base_substring, to ensure trailing H (historical vector) is also considered
    return any(total_var in vector_base_substring for total_var in TOTAL_VARS)


def create_per_day_vector_name(vector: str) -> str:
    return f"PER_DAY_{vector}"


def create_per_interval_vector_name(vector: str) -> str:
    return f"PER_INTVL_{vector}"


def is_per_interval_vector(vector_name: str) -> bool:
    return vector_name.startswith("PER_INTVL_")


def is_per_day_vector(vector_name: str) -> bool:
    return vector_name.startswith("PER_DAY_")


def is_per_interval_or_per_day_vector(vector_name: str) -> bool:
    return is_per_interval_vector(vector_name) or is_per_day_vector(vector_name)


def get_total_vector_name(vector_name: str) -> str:
    if vector_name.startswith("PER_DAY_"):
        return vector_name.lstrip("PER_DAY_")
    if vector_name.startswith("PER_INTVL_"):
        return vector_name.lstrip("PER_INTVL_")
    raise InvalidDataError(f"Expected {vector_name} to be a derived PER_DAY or PER_INTVL vector!", Service.GENERAL)


def create_per_interval_vector_table_pa(total_vector_table_pa: pa.Table) -> pa.Table:
    """
    Calculates interval delta data for vector column in provided table.

    The input table must contain columns "DATE", "REAL" and the total vector name.
    The output table will contain columns "DATE", "REAL" and the per interval vector name.

    This function assumes data is already resampled according to wanted frequency. The per interval value is calculated as the
    difference between two consecutive total values. The value at element `n` is the difference between element `n` and `n+1`,
    thereby the last value is defined as null, and set to 0.0.

    Raises InvalidDataError if the input table does not contain the expected columns.
    """

    column_names = set(total_vector_table_pa.column_names)
    if len(column_names) != 3:
        raise InvalidDataError("Table must contain at least 3 columns", Service.GENERAL)

    if not column_names.issuperset(["DATE", "REAL"]):
        raise InvalidDataError("Table must contain columns 'DATE' and 'REAL'", Service.GENERAL)

    total_vector_name: str = (column_names - {"DATE", "REAL"}).pop()
    validate_summary_vector_table_pa(total_vector_table_pa, total_vector_name)

    per_interval_vector_name = create_per_interval_vector_name(total_vector_name)

    # Convert to polars DataFrame
    # - Utilize polars for efficient group_by operation and expressions
    # - Sort by "REAL" thereafter "DATE"
    sorted_total_vector_df = pl.DataFrame(total_vector_table_pa).sort(["REAL", "DATE"])

    # Calculate per interval delta values
    # - group_by("REAL") to create per interval delta values per realization for vector.
    # - diff() calculates diff between element n and n-1 for a vector and given realization, sorted by date. First element is then null.
    # - The resulting interval value for element n yields from n to n+1, thus shift(-1).
    # - After shift(-1) the last value is null, thereby fill_null with 0.0.
    # - explode() to make per interval dataframe grouped per realization into one dataframe in long format:
    #        -  https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.explode.html#polars-dataframe-explode

    per_interval_expr: pl.Expr = (
        pl.col(total_vector_name).diff().shift(-1).fill_null(0.0).alias(per_interval_vector_name)
    )

    sorted_per_interval_vector_df = (
        sorted_total_vector_df.group_by("REAL")
        .agg([pl.col("DATE"), per_interval_expr])
        .explode(["DATE", per_interval_vector_name])
    )

    return sorted_per_interval_vector_df.to_arrow()


def create_per_day_vector_table_pa(total_vector_table_pa: pa.Table) -> pa.Table:
    """
    Calculates interval delta per day data for vector column in provided table.

    This implies calculating interval delta data, and divide the delta by number of days between each date.

    The input table must contain columns "DATE", "REAL" and the total vector name.
    The output table will contain columns "DATE", "REAL" and the per day vector name.

    This function assumes data is already resampled according to wanted frequency. The per day value is calculated as the
    difference between two consecutive total values, divided by the number of days between the two dates. The value at element `n`
    is the difference between element `n` and `n+1`, divided by the number of days between the two dates, thereby the last value is
    defined as null, and set to 0.0.

    Raises InvalidDataError if the input table does not contain the expected columns.
    """

    column_names = set(total_vector_table_pa.column_names)
    if len(column_names) != 3:
        raise InvalidDataError("Table must contain at least 3 columns", Service.GENERAL)

    if not column_names.issuperset(["DATE", "REAL"]):
        raise InvalidDataError("Table must contain columns 'DATE' and 'REAL'", Service.GENERAL)

    total_vector_name: str = (column_names - {"DATE", "REAL"}).pop()
    validate_summary_vector_table_pa(total_vector_table_pa, total_vector_name)

    per_day_vector_name = create_per_day_vector_name(total_vector_name)

    # Convert to polars DataFrame
    # - Utilize polars for efficient group_by operation and expressions
    # - Sort by "REAL" thereafter "DATE"
    sorted_total_vector_df = pl.DataFrame(total_vector_table_pa).sort(["REAL", "DATE"])

    # Calculate per interval delta values
    # - group_by("REAL") to create per interval delta values per realization for vector.
    # - diff() calculates diff between element n and n-1 for a vector and given realization, sorted by date. First element is then null.
    # - The resulting interval value for element n yields from n to n+1, thus shift(-1).
    # - After shift(-1) the last value is null, thereby fill_null with 0.0.
    # - per day is per interval delta divided by number of days between each date.
    # - explode() to make per interval dataframe grouped per realization into one dataframe in long format:
    #        -  https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.explode.html#polars-dataframe-explode

    # Cast to float32 to avoid integer division
    per_interval_expr = pl.col(total_vector_name).diff().shift(-1).fill_null(0.0).cast(pl.Float32)
    diff_dates_expr = pl.col("DATE").diff().shift(-1).dt.total_days().cast(pl.Float32)
    per_day_expr = (per_interval_expr / diff_dates_expr).fill_null(0.0).alias(per_day_vector_name)

    sorted_per_day_vector_df = (
        sorted_total_vector_df.group_by("REAL")
        .agg([pl.col("DATE"), per_day_expr])
        .explode(["DATE", per_day_vector_name])
    )

    return sorted_per_day_vector_df.to_arrow()


def create_realization_derived_vector_list(
    vector_table: pa.Table, vector_name: str, unit: str
) -> list[RealizationDerivedVector]:
    """
    Create a list of RealizationDerivedVector from the vector table.
    """
    validate_summary_vector_table_pa(vector_table, vector_name)

    real_arr_np = vector_table.column("REAL").to_numpy()
    unique_reals, first_occurrence_idx, real_counts = np.unique(real_arr_np, return_index=True, return_counts=True)

    whole_date_np_arr = vector_table.column("DATE").to_numpy()
    whole_value_np_arr = vector_table.column(vector_name).to_numpy()

    ret_arr: list[RealizationDerivedVector] = []
    for i, real in enumerate(unique_reals):
        start_row_idx = first_occurrence_idx[i]
        row_count = real_counts[i]
        date_np_arr = whole_date_np_arr[start_row_idx : start_row_idx + row_count]
        value_np_arr = whole_value_np_arr[start_row_idx : start_row_idx + row_count]

        # Create RealizationDeltaVector
        ret_arr.append(
            RealizationDerivedVector(
                realization=real,
                timestamps_utc_ms=date_np_arr.astype(int).tolist(),
                values=value_np_arr.tolist(),
                unit=unit,
            )
        )

    return ret_arr
