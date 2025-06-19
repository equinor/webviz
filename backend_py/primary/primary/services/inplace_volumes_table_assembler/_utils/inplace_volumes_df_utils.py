import polars as pl

from .polars_column_utils import is_invalid_column

from primary.services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
)

from primary.services.service_exceptions import Service, InvalidDataError
from primary.services.sumo_access.inplace_volumes_table_access import InplaceVolumesTableAccess

"""
This file contains general utility functions for handling DataFrames for inplace volumes.

The methods can be used to calculate, aggregate and create inplace volumes data for the Inplace Volumes Table Assembler
"""


def validate_inplace_volumes_df_selector_columns(
    inplace_volumes_df: pl.DataFrame,
) -> None:
    """
    Validate the inplace volumes DataFrame to ensure it contains the necessary selector columns.

    Raises InvalidDataError if the DataFrame does not contain the required selector columns.
    """
    existing_columns = set(inplace_volumes_df.columns)
    required_index_columns = set(InplaceVolumesTableAccess.get_required_index_column_names())

    missing_required_columns = required_index_columns - existing_columns
    if missing_required_columns:
        raise InvalidDataError(
            f"Missing required index columns in the inplace volumes DataFrame: {missing_required_columns}",
            Service.GENERAL,
        )

    if "REAL" not in existing_columns:
        raise InvalidDataError(
            "The 'REAL' column is missing in the inplace volumes DataFrame. It is required for realization data.",
            Service.GENERAL,
        )


def sum_inplace_volumes_grouped_by_indices_and_real_df(
    inplace_volumes_df: pl.DataFrame,
    group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
) -> pl.DataFrame:
    """
    Create a Polars DataFrame with summed volumes per index to group by and realization.

    This function groups a DataFrame of inplace volumes by specified index columns and realizations,
    summing the volume columns within each group. The result is a single row per realization and requested group by index.

    This function assumes that the inplace_volumes_df has been filtered to only contain rows of interest, i.e. index value, realizations, etc.

    ### Output Columns
    The resulting DataFrame will always include:
    - `"REAL"`: The realization identifier (always present).
    - All columns specified in `group_by_indices`, if any.
    - Volume columns (e.g., `"STOIIP"`, `"GIIP"`, `"HCPV"`) — all columns that are not index columns or `"REAL"`.

    ### Notes
    - The function returns per-realization sums, enabling later statistical aggregation
    (e.g., P10, P50, P90) across realizations.

    ### Example
    **Input**
    ```
    inplace_volumes_df.columns = ["FLUID", "ZONE", "REGION", "FACIES", "REAL", "STOIIP", "GIIP", "HCPV"]
    group_by_indices = [InplaceVolumes.TableIndexColumns.ZONE]
    ```
    **Output**
    ```
    per_group_summed_df.columns = ["ZONE", "REAL", "STOIIP", "GIIP", "HCPV"]
    ```
    """
    column_names = inplace_volumes_df.columns

    # Verify that the DataFrame has the required columns (always require FLUID column)
    required_index_columns: set[str] = {e.value for e in group_by_indices} if group_by_indices else set()
    required_selector_columns = {"REAL"} | required_index_columns
    missing_selector_columns = required_selector_columns - set(column_names)
    if missing_selector_columns:
        raise ValueError(f"Missing required selector columns in the input DataFrame: {missing_selector_columns}")

    # Group by each of the indices (always accumulate by realization - i.e. max one value per realization)
    columns_to_group_by_for_sum = {"REAL"}
    if group_by_indices:
        columns_to_group_by_for_sum = {"REAL"} | {e.value for e in group_by_indices}

    # Aggregate volume columns
    volume_columns = [col for col in column_names if col not in InplaceVolumesTableAccess.get_selector_column_names()]

    # Selector columns not in group by will be excluded, these should not be aggregated
    per_group_summed_df = inplace_volumes_df.group_by(columns_to_group_by_for_sum).agg(
        [pl.col(col).drop_nulls().sum().alias(col) for col in volume_columns]
    )

    return per_group_summed_df


def create_inplace_volumes_df_per_unique_fluid_value(
    inplace_volumes_table_df: pl.DataFrame,
) -> dict[str, pl.DataFrame]:
    """
    Create an inplace volumes table DataFrame per unique fluid value.

    The fluid value is the unique value in the `FLUID` column of the inplace volumes table DataFrame, i.e. value of the InplaceVolumes.Fluid enum, or summed fluids like "oil + gas".

    Groups the inplace volumes table DataFrame by fluid and stores a new DataFrame, excluding the fluid column, for each fluid in a dictionary.

    Returns:
    dict[str, pl.DataFrame]: A dictionary with fluid string as key and inplace volumes DataFrame as value

    """
    if InplaceVolumes.TableIndexColumns.FLUID.value not in inplace_volumes_table_df.columns:
        raise ValueError("FLUID column is required in the inplace volumes DataFrame")

    fluid_to_df_map: dict[str, pl.DataFrame] = {}
    for group_name, grouped_df in inplace_volumes_table_df.group_by(InplaceVolumes.TableIndexColumns.FLUID.value):
        fluid = str(group_name[0])

        # DataFrame with all columns except the FLUID column
        fluid_to_df_map[fluid] = grouped_df.drop(InplaceVolumes.TableIndexColumns.FLUID.value)

    return fluid_to_df_map


def remove_invalid_optional_index_columns(inplace_volumes_df: pl.DataFrame) -> pl.DataFrame:
    """
    Remove invalid optional index columns from inplace volumes DataFrame

    Invalid when the column only contains Nan values or null values.

    Args:
    - inplace_volumes_df (pl.DataFrame): Inplace volumes DataFrame

    Returns:
    - pl.DataFrame: Inplace volumes DataFrame with invalid optional index columns removed
    """

    column_names = set(inplace_volumes_df.columns)
    optional_index_column_names = set(InplaceVolumesTableAccess.get_index_column_names()) - set(
        InplaceVolumesTableAccess.get_required_index_column_names()
    )
    existing_optional_index_columns = optional_index_column_names & column_names

    valid_inplace_volumes_df = inplace_volumes_df
    for column in existing_optional_index_columns:
        if is_invalid_column(inplace_volumes_df[column]):
            valid_inplace_volumes_df = valid_inplace_volumes_df.drop(column)

    return valid_inplace_volumes_df
