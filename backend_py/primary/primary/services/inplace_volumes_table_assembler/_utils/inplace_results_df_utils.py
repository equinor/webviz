from typing import Callable, Iterable

import numpy as np
import polars as pl

from .conversion_utils import create_repeated_table_column_data_from_polars_column, get_fluid_from_string
from .polars_column_utils import is_invalid_column
from .polars_expression_utils import (
    create_calculated_volume_column_expressions,
    create_property_column_expressions,
)

from primary.services.sumo_access.inplace_volumes_table_types import (
    CategorizedResultNames,
    InplaceVolumes,
    RepeatedTableColumnData,
    Statistic,
    TableColumnStatisticalData,
)

from primary.services.service_exceptions import Service, InvalidDataError

"""
This file contains general utility functions for handling DataFrames for result volumes.

The methods can be used to calculate, aggregate and create result volumes data for the Inplace Volumes Table Assembler

Results = volumes + properties + calculated volumes
"""


def create_per_fluid_results_df(
    per_fluid_inplace_volumes_df: pl.DataFrame,
    categorized_requested_result_names: CategorizedResultNames,
    fluid_value: str,
) -> pl.DataFrame:
    """
    Create a result dataframe from the volumes table and requested result names (volumes, calculated volumes, and calculated properties).

    If volume names needed for properties are not available in the volumes dataframe, the function will skip the property. If the a result
    column is invalid, i.e. contains only null/nan values, it will be removed from the result dataframe.

    The result dataframe contains the requested volume names, calculated volumes and calculated properties.
    """
    if InplaceVolumes.TableIndexColumns.FLUID.value in per_fluid_inplace_volumes_df.columns:
        raise InvalidDataError(
            "The DataFrame should not contain FLUID column when DataFrame is per unique fluid value",
            Service.GENERAL,
        )

    # Convert fluid selection to fluid zone
    fluid: InplaceVolumes.Fluid | None = get_fluid_from_string(fluid_value)

    # Find valid selector columns and volume names
    possible_selector_columns = InplaceVolumes.selector_columns()
    available_selector_columns = [
        col for col in possible_selector_columns if col in per_fluid_inplace_volumes_df.columns
    ]
    requested_volume_names = categorized_requested_result_names.volume_names
    available_requested_volume_names = [
        name for name in requested_volume_names if name in per_fluid_inplace_volumes_df.columns
    ]

    # Create calculated volume column expressions
    requested_calculated_volume_names = categorized_requested_result_names.calculated_volume_names
    calculated_volume_column_expressions: list[pl.Expr] = create_calculated_volume_column_expressions(
        per_fluid_inplace_volumes_df.columns, requested_calculated_volume_names, fluid
    )

    # Create property column expressions
    requested_properties = categorized_requested_result_names.property_names
    property_column_expressions: list[pl.Expr] = create_property_column_expressions(
        per_fluid_inplace_volumes_df.columns, requested_properties, fluid
    )

    # Create result dataframe, select columns and calculate volumes + properties
    column_names_and_expressions = (
        available_selector_columns
        + available_requested_volume_names
        + calculated_volume_column_expressions
        + property_column_expressions
    )
    results_df = per_fluid_inplace_volumes_df.select(column_names_and_expressions)

    # Drop invalid columns
    valid_results_df = results_df.drop([col for col in results_df.columns if is_invalid_column(results_df[col])])

    return valid_results_df


def create_statistical_result_table_data_from_df(
    per_fluid_results_realization_df: pl.DataFrame,
) -> tuple[list[RepeatedTableColumnData], list[TableColumnStatisticalData]]:
    """
    Create result table data with statistics across realizations, for a fluid.

    The DataFrame is expected to be for a given fluid value, i.e. the "FLUID" column is not present in the DataFrame.

    The function assumes the input result DataFrame, for a specific fluid value, is already grouped by selected indices and realizations,
    and accumulated per group. Thereby we can group by existing index columns and calculate statistics across the realizations in the
    input DataFrame. To get correct statistics across all realizations, the input result df must be pre-processed to contain non-duplicate
    "REAL" values per group when grouping with group_by_indices.

    The order of the arrays in the statistical data lists will match the order of the rows in the selector column data list.

    Statistics: Mean, stddev, min, max, p10, p90

    Parameters:
    - per_fluid_result_realization_df: Dataframe with selector columns and result columns, for a fluid value.

    Returns:
    - Tuple with selector column data list and results statistical data list for the provided result DataFrame.
    """
    columns = set(per_fluid_results_realization_df.columns)
    if "REAL" not in columns:
        raise ValueError(
            "Input DataFrame must contain 'REAL' column for realizations to calculate statistics across realizations"
        )

    # Calculate statistics across realizations, i.e. group by existing index columns
    possible_index_columns = set(InplaceVolumes.index_columns())
    existing_index_columns = columns & possible_index_columns

    # Find valid result names in df
    existing_result_names = list(set(columns) - set(InplaceVolumes.selector_columns()))

    # Define statistical aggregation expressions
    requested_statistics = [
        Statistic.MEAN,
        Statistic.STD_DEV,
        Statistic.MIN,
        Statistic.MAX,
        Statistic.P10,
        Statistic.P90,
    ]
    statistic_aggregation_expressions = _create_statistic_aggregation_expressions(
        existing_result_names, requested_statistics
    )

    # Groupby and aggregate result df
    # - Expect the result df to have one unique column per statistic per result name, i.e. "result_name_mean", "result_name_stddev", etc.
    statistical_results_df: pl.DataFrame | None = None
    if existing_index_columns:
        columns_to_select = list(existing_index_columns) + existing_result_names
        statistical_results_df = (
            per_fluid_results_realization_df.select(columns_to_select)
            .group_by(existing_index_columns)
            .agg(statistic_aggregation_expressions)
        )
    else:
        # If no existing index columns, aggregate entire df using expressions in select
        # Only keep the result name columns and its statistics (i.e. keep no index columns)
        statistical_results_df = per_fluid_results_realization_df.select(statistic_aggregation_expressions)

    # Convert statistical DataFrame to statistical result table data
    (
        selector_column_data_list,
        results_statistical_data_list,
    ) = _convert_statistical_results_df_to_statistical_results_table_data(
        statistical_results_df, existing_result_names, requested_statistics
    )

    return (selector_column_data_list, results_statistical_data_list)


def _get_statistical_function_expression(statistic: Statistic) -> Callable[[pl.Expr], pl.Expr] | None:
    """
    Get statistical function Polars expression based on statistic enum

    Note: Inverted P10 and P90 according to oil industry standards
    """
    statistical_function_expression_map: dict[Statistic, Callable[[pl.Expr], pl.Expr]] = {
        Statistic.MEAN: lambda col: col.mean(),
        Statistic.MIN: lambda col: col.min(),
        Statistic.MAX: lambda col: col.max(),
        Statistic.STD_DEV: lambda col: col.std(),
        Statistic.P10: lambda col: col.quantile(0.9, "linear"),  # Inverted P10 and P90
        Statistic.P90: lambda col: col.quantile(0.1, "linear"),  # Inverted P10 and P90
    }

    return statistical_function_expression_map.get(statistic)


def _create_statistical_expression(statistic: Statistic, column_name: str, drop_nans: bool = True) -> pl.Expr:
    """
    Generate the Polars expression for the given statistic.
    """
    base_col = pl.col(column_name)
    if drop_nans:
        base_col = base_col.drop_nans()
    stat_func_expr = _get_statistical_function_expression(statistic)
    if stat_func_expr is None:
        raise ValueError(f"Unsupported statistic: {statistic}")
    return stat_func_expr(base_col).alias(f"{column_name}_{statistic}")


def _create_statistic_aggregation_expressions(
    result_columns: Iterable[str], statistics: list[Statistic], drop_nans: bool = True
) -> list[pl.Expr]:
    """
    Create Polars expressions for aggregation of result columns
    """
    expressions = []
    for column_name in result_columns:
        for statistic in statistics:
            expressions.append(_create_statistical_expression(statistic, column_name, drop_nans))
    return expressions


def _convert_statistical_results_df_to_statistical_results_table_data(
    statistical_df: pl.DataFrame,
    valid_result_names: list[str],
    requested_statistics: list[Statistic],
) -> tuple[list[RepeatedTableColumnData], list[TableColumnStatisticalData]]:
    """
    Convert statistical results DataFrame to statistical result table data

    Expect the statistical DataFrame to have one unique column per requested statistic per result name, i.e. "result_name_mean", "result_name_stddev", etc.
    """
    possible_selector_columns = InplaceVolumes.selector_columns()

    # Build selector columns from statistical table
    selector_column_data_list: list[RepeatedTableColumnData] = []
    final_selector_columns = [name for name in possible_selector_columns if name in statistical_df.columns]
    for column_name in final_selector_columns:
        column = statistical_df[column_name]
        selector_column_data_list.append(create_repeated_table_column_data_from_polars_column(column_name, column))

    # Fill statistics for each result
    results_statistical_data_dict: dict[str, TableColumnStatisticalData] = {}
    available_statistic_column_names = statistical_df.columns
    for result_name in valid_result_names:
        result_statistical_data = TableColumnStatisticalData(column_name=result_name, statistic_values={})
        for statistic in requested_statistics:
            statistic_column_name = f"{result_name}_{statistic}"
            if statistic_column_name not in available_statistic_column_names:
                raise ValueError(f"Column {statistic_column_name} not found in statistical table")

            statistic_array = statistical_df[statistic_column_name].fill_null(np.nan)
            result_statistical_data.statistic_values[statistic] = statistic_array.to_list()

        # Add result statistical data to dictionary
        results_statistical_data_dict[result_name] = result_statistical_data

    # Create list of results statistical data from dictionary values
    results_statistical_data_list: list[TableColumnStatisticalData] = list(results_statistical_data_dict.values())

    # Validate length of columns
    _validate_length_of_statistics_data_lists(selector_column_data_list, results_statistical_data_list)

    return (selector_column_data_list, results_statistical_data_list)


def _validate_length_of_statistics_data_lists(
    selector_column_data_list: list[RepeatedTableColumnData],
    result_statistical_data_list: list[TableColumnStatisticalData],
) -> None:
    """
    Verify that the length of the statistical data lists are equal. I.e. equal number of rows in each list.

    NOTE: Allows empty lists
    """
    if len(selector_column_data_list) == 0 and len(result_statistical_data_list) == 0:
        return

    expected_num_rows = 0
    if len(selector_column_data_list) != 0:
        expected_num_rows = len(selector_column_data_list[0].indices)
    else:
        expected_num_rows = len(next(iter(result_statistical_data_list[0].statistic_values.values())))

    for selector_column_data in selector_column_data_list:
        num_rows = len(selector_column_data.indices)
        if num_rows != expected_num_rows:
            raise ValueError(
                f"Length of {selector_column_data.column_name} column data list does not match expected number of rows: {expected_num_rows}. Got: {num_rows}"
            )
    for result_statistical_data in result_statistical_data_list:
        for statistic, statistic_values in result_statistical_data.statistic_values.items():
            if len(statistic_values) != expected_num_rows:
                result_name = result_statistical_data.column_name
                raise ValueError(
                    f"Number of {result_name} statistic {statistic.value} values does not match expected number of rows: {expected_num_rows}. Got: {len(statistic_values)}"
                )
