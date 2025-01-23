import numpy as np
import pyarrow as pa
import polars as pl

from primary.services.service_exceptions import InvalidDataError, Service

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


def get_total_vector_name(cumulative_vector_name: str) -> str:
    if cumulative_vector_name.startswith("PER_DAY_"):
        return cumulative_vector_name.lstrip("PER_DAY_")
    if cumulative_vector_name.startswith("PER_INTVL_"):
        return cumulative_vector_name.lstrip("PER_INTVL_")
    raise InvalidDataError(f"Expected {cumulative_vector_name} to be a cumulative vector!", Service.GENERAL)


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
    per_interval_vector_name = create_per_interval_vector_name(total_vector_name)

    # Convert to polars DataFrame
    # - Utilize polars for group_by operation
    # - Sort by "REAL" thereafter "DATE"
    sorted_total_vector_df = pl.DataFrame(total_vector_table_pa).sort(["REAL", "DATE"])

    # Build output columns
    date_column = pa.array([], total_vector_table_pa.column("DATE").type)
    real_column = pa.array([], total_vector_table_pa.column("REAL").type)
    per_interval_column = pa.array([], total_vector_table_pa.column(total_vector_name).type)

    # Group by each realization number and calculate per interval values,
    # the sorting is preserved, thus grouped df is sorted by date
    for real_nums, sorted_real_vector_df in sorted_total_vector_df.group_by(["REAL"]):
        if len(real_nums) != 1:
            raise InvalidDataError(f"Expected exactly realization number for group, got: {real_nums}", Service.GENERAL)

        # Calculate per interval delta values
        # - diff() calculates diff between element n and n-1
        # - The resulting interval value for element n yields from n to n+1, thus shift by -1
        # - After shift(-1) the last value is null, thereby fill  with 0.0
        per_interval_real_values = (
            sorted_real_vector_df[total_vector_name].diff().shift(-1).fill_null(0.0).alias(per_interval_vector_name)
        ).to_arrow()

        # Append to output columns
        date_column = pa.concat_arrays([date_column, sorted_real_vector_df["DATE"].to_arrow()])
        real_column = pa.concat_arrays([real_column, sorted_real_vector_df["REAL"].to_arrow()])
        per_interval_column = pa.concat_arrays([per_interval_column, per_interval_real_values])

    # Create output table from output columns
    per_interval_vector_table_pa = pa.table(
        {
            "DATE": date_column,
            "REAL": real_column,
            per_interval_vector_name: per_interval_column,
        }
    )
    return per_interval_vector_table_pa


def create_per_interval_vector_table_pa_v2(total_vector_table_pa: pa.Table) -> pa.Table:
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
    per_interval_vector_name = create_per_interval_vector_name(total_vector_name)

    # Convert to polars DataFrame
    # - Utilize polars for efficient group_by operation and expressions
    # - Sort by "REAL" thereafter "DATE"
    sorted_total_vector_df = pl.DataFrame(total_vector_table_pa).sort(["REAL", "DATE"])

    # Calculate per interval delta values
    # - group_by("REAL") to create per interval dataframe per realization,
    # - diff() calculates diff between element n and n-1 for a vector and given realization, sorted by date. First element is then null.
    # - The resulting interval value for element n yields from n to n+1, thus shift(-1).
    # - After shift(-1) the last value is null, thereby fill_null with 0.0.
    # - explode() to make per interval dataframe grouped per realization into one dataframe in long format:
    #        -  https://docs.pola.rs/api/python/stable/reference/dataframe/api/polars.DataFrame.explode.html#polars-dataframe-explode
    sorted_per_interval_vector_df = (
        sorted_total_vector_df.group_by("REAL")
        .agg(
            [pl.col("DATE"), pl.col(total_vector_name).diff().shift(-1).fill_null(0.0).alias(per_interval_vector_name)]
        )
        .explode(["DATE", per_interval_vector_name])
    )

    return sorted_per_interval_vector_df.to_arrow()
