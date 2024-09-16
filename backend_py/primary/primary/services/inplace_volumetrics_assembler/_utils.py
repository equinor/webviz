from typing import Callable

import numpy as np
import polars as pl

from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    InplaceVolumetricTableData,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricResultName,
    RepeatedTableColumnData,
    Statistic,
    TableColumnData,
    TableColumnStatisticalData,
)

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess
from ..service_exceptions import Service, InvalidParameterError

"""
This file contains general utility functions for the Inplace Volumetrics provider

The methods can be used to calculate, aggregate and create data for the Inplace Volumetrics provider
"""


def get_valid_result_names_from_list(result_names: list[str]) -> list[str]:
    """
    Get valid result names from list of result names
    """
    valid_result_names = []
    for result_name in result_names:
        if result_name in InplaceVolumetricResultName.__members__:
            valid_result_names.append(result_name)
    return valid_result_names


def create_per_group_summed_realization_volume_df(
    volume_df: pl.DataFrame,
    group_by_identifiers: list[InplaceVolumetricsIdentifier] | None,
) -> pl.DataFrame:
    """
    Create volume DataFrame with sum per selected group. The sum volumes are grouped per realization, i.e. a column named "REAL"
    should always be among the output columns.

    Note that selector columns are not aggregated, only the volume columns are aggregated. Thus the selector columns not among
    group by identifiers is excluded from the output.

    After accumulating the sum, the properties can be calculated across realizations for each group.
    """
    if "REAL" not in volume_df.columns:
        raise ValueError("REAL column not found in volume DataFrame")

    # Group by each of the identifier (always accumulate by realization - i.e. max one value per realization)
    columns_to_group_by_for_sum = ["REAL"]
    if group_by_identifiers:
        columns_to_group_by_for_sum = list({elm.value for elm in group_by_identifiers} | {"REAL"})

    # Selector columns should not be aggregated
    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()

    # Selector columns not in group by will be excluded, these should not be aggregated
    per_group_summed_df = volume_df.group_by(columns_to_group_by_for_sum).agg(
        [pl.sum("*").exclude(possible_selector_columns)]
    )

    return per_group_summed_df


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
    result_columns: list[str], statistics: list[Statistic], drop_nans: bool = True
) -> list[pl.Expr]:
    """
    Create Polars expressions for aggregation of result columns
    """
    expressions = []
    for column_name in result_columns:
        for statistic in statistics:
            expressions.append(_create_statistical_expression(statistic, column_name, drop_nans))
    return expressions


def _convert_statistical_df_to_statistical_result_table_data(
    statistical_df: pl.DataFrame,
    valid_result_names: list[str],
    requested_statistics: list[Statistic],
) -> tuple[list[RepeatedTableColumnData], list[TableColumnStatisticalData]]:
    """
    Convert statistical DataFrame to statistical result table data

    Expect the statistical DataFrame to have one unique column per requested statistic per result name, i.e. "result_name_mean", "result_name_stddev", etc.
    """
    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()

    # Build selector columns from statistical table
    selector_column_data_list: list[RepeatedTableColumnData] = []
    final_selector_columns = [name for name in possible_selector_columns if name in statistical_df.columns]
    for column_name in final_selector_columns:
        column = statistical_df[column_name]
        selector_column_data_list.append(_create_repeated_table_column_data_from_polars_column(column_name, column))

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


def create_grouped_statistical_result_table_data_polars(
    result_df: pl.DataFrame,
    group_by_identifiers: list[InplaceVolumetricsIdentifier] | None,
) -> tuple[list[RepeatedTableColumnData], list[TableColumnStatisticalData]]:
    """
    Create result table data with statistics across column values based on group by identifiers selection. The
    statistics are calculated across all values per grouping, thus the output will have one row per group.

    To get statistics across all realizations, the input result df must be pre-processed to contain non-duplicate "REAL" values
    per group when grouping with group_by_identifiers.

    The order of the arrays in the statistical data lists will match the order of the rows in the selector column data list.

    Statistics: Mean, stddev, min, max, p10, p90

    Parameters:
    - result_df: Dataframe with selector columns and result columns
    - group_by_identifiers: list of identifiers to group by, should be equal to the group by used used to pre-process the input result df

    Returns:
    - Tuple with selector column data list and results statistical data list
    """
    if group_by_identifiers == []:
        raise InvalidParameterError("Group by identifiers must be a non-empty list or None", Service.GENERAL)

    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    valid_selector_columns = [elm for elm in possible_selector_columns if elm in result_df.columns]

    # Find valid result names in df
    valid_result_names = [elm for elm in result_df.columns if elm not in valid_selector_columns]

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
        valid_result_names, requested_statistics
    )

    # Groupby and aggregate result df
    # - Expect the result df to have one unique column per statistic per result name, i.e. "result_name_mean", "result_name_stddev", etc.
    per_group_statistical_df: pl.DataFrame | None = None
    if group_by_identifiers is None:
        # If no grouping, aggregate entire df using expressions in select
        # Only keep the result name columns and its statistics (i.e. keep no identifier columns)
        per_group_statistical_df = result_df.select(statistic_aggregation_expressions)
    else:
        group_by_identifier_values = list(set([elm.value for elm in group_by_identifiers]))
        # Perform aggregation per grouping
        per_group_statistical_df = (
            result_df.select(group_by_identifier_values + valid_result_names)
            .group_by(group_by_identifier_values)
            .agg(statistic_aggregation_expressions)
        )

    # Convert statistical DataFrame to statistical result table data
    selector_column_data_list, results_statistical_data_list = _convert_statistical_df_to_statistical_result_table_data(
        per_group_statistical_df, valid_result_names, requested_statistics
    )

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


def _create_repeated_table_column_data_from_polars_column(
    column_name: str, column_values: pl.Series
) -> RepeatedTableColumnData:
    """
    Create repeated table column data from column name and column values as Polars Series

    Note that the unique values are not sorted, but the indices vector is built to preserve order
    in the input column values.
    """

    # unique() method might not preserve the order of the unique values
    unique_values: list[str | int] = column_values.unique().to_list()
    value_to_index_map = {value: index for index, value in enumerate(unique_values)}
    indices: list[int] = [value_to_index_map[value] for value in column_values.to_list()]

    return RepeatedTableColumnData(column_name=column_name, unique_values=unique_values, indices=indices)


def create_inplace_volumetric_table_data_from_result_df(
    result_df: pl.DataFrame, selection_name: str
) -> InplaceVolumetricTableData:
    """
    Create Inplace Volumetric Table Data from result DataFrame, selection name and specified selector columns
    """
    if result_df.is_empty():
        return InplaceVolumetricTableData(fluid_selection_name=selection_name, selector_columns=[], result_columns=[])

    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    existing_selector_columns = [name for name in result_df.columns if name in possible_selector_columns]
    selector_column_data_list: list[RepeatedTableColumnData] = []
    for column_name in existing_selector_columns:
        column = result_df[column_name]
        selector_column_data_list.append(_create_repeated_table_column_data_from_polars_column(column_name, column))

    existing_result_column_names = [name for name in result_df.columns if name not in existing_selector_columns]
    result_column_data_list: list[TableColumnData] = []
    for column_name in existing_result_column_names:
        result_column_data_list.append(
            TableColumnData(column_name=column_name, values=result_df[column_name].to_list())
        )

    return InplaceVolumetricTableData(
        fluid_selection_name=selection_name,
        selector_columns=selector_column_data_list,
        result_columns=result_column_data_list,
    )


def create_volumetric_df_per_fluid_zone(
    fluid_zones: list[FluidZone],
    volumetric_df: pl.DataFrame,
) -> dict[FluidZone, pl.DataFrame]:
    """
    Create a volumetric DataFrame per fluid zone

    Extracts the columns for each fluid zone and creates a new DataFrame for each fluid zone, with
    the same identifier columns and REAL column as the original table.

    The fluid columns are stripped of the fluid zone suffix.

    Returns:
    dict[FluidZone, pl.DataFrame]: A dictionary with fluid zone as key and volumetric DataFrame as value


    Example:
    - Input:
        - fluid_zone: [FluidZone.OIL, FluidZone.GAS]
        - volumetric_df: pl.DataFrame
            - volumetric_df.columns = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]

    - Output:
        - df_dict: dict[FluidZone, pl.DataFrame]:
            - df_dict[FluidZone.OIL]: volumetric_df_oil
                volumetric_df_oil.columns = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "HCPV"]
            - df_dict[FluidZone.GAS]: volumetric_df_gas
                - volumetric_df_gas.columns = ["REAL", "ZONE", "REGION", "FACIES", "GIIP", "HCPV"]

    """
    column_names: list[str] = volumetric_df.columns

    # Iterate over column_names to keep order of volumetric_df.columns
    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    selector_columns = [col for col in column_names if col in possible_selector_columns]

    fluid_zone_to_df_map: dict[FluidZone, pl.DataFrame] = {}
    for fluid_zone in fluid_zones:
        fluid_zone_suffix = f"_{fluid_zone.value.upper()}"
        fluid_columns = [name for name in column_names if name.endswith(fluid_zone_suffix)]

        if not fluid_columns:
            continue

        # Mapping old column with suffix to new column without fluid zone suffix, e.g. "HCPV_OIL" -> "HCPV"
        columns_rename_map: dict[str, str] = {col: col.removesuffix(fluid_zone_suffix) for col in fluid_columns}
        fluid_zone_df = volumetric_df.select(selector_columns + fluid_columns).rename(columns_rename_map)

        # Place DataFrame into fluid zone map
        fluid_zone_to_df_map[fluid_zone] = fluid_zone_df
    return fluid_zone_to_df_map


def create_volumetric_summed_fluid_zones_df(
    volumetric_df: pl.DataFrame,
    fluid_zones: list[FluidZone],
) -> pl.DataFrame:
    """
    Creating a volumetric DataFrame summed across fluid zones

    Extract the columns for each fluid zone and create a new DataFrame where each fluid zone per volume column is summed.

    The fluid columns are stripped of the fluid zone suffix.

    Example:
    - Input:
        - fluid_zone: [FluidZone.OIL, FluidZone.GAS]
        - volumetric_df: pl.DataFrame
            - volumetric_df.columns = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]

    - Output:
        - volumetric_df_across_fluid_zones: pl.DataFrame
            - volumetric_df_across_fluid_zones.columns = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "GIIP", "HCPV"]
    """

    # Iterate over column_names to keep order of volumetric_df.columns
    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    valid_selector_columns = [col for col in volumetric_df.columns if col in possible_selector_columns]

    # Get volume names among columns
    volumetric_names_with_fluid_zone = [col for col in volumetric_df.columns if col not in valid_selector_columns]

    # Extract set of volume names without fluid zone suffix
    suffixes_to_remove = [f"_{fluid_zone.value.upper()}" for fluid_zone in fluid_zones]
    volumetric_names = list(
        {
            name.removesuffix(suffix)  # Remove the suffix if it exists
            for name in volumetric_names_with_fluid_zone
            for suffix in suffixes_to_remove
            if name.endswith(suffix)  # Only remove if the suffix is present
        }
    )

    # Per volume name without fluid zone suffix, sum the columns with the same name
    volume_name_sum_expressions: list[pl.Expr] = []
    for volume_name in volumetric_names:
        # Get volume columns with selected fluid zones
        volume_columns_with_suffix = [
            col
            for col in volumetric_df.columns
            if col.startswith(volume_name) and any(col.endswith(suffix) for suffix in suffixes_to_remove)
        ]

        if not volume_columns_with_suffix:
            continue

        # Sum columns with the same volume name
        volume_name_sum_expression: pl.Expr = pl.col(volume_columns_with_suffix[0])
        for col in volume_columns_with_suffix[1:]:
            volume_name_sum_expression = volume_name_sum_expression + pl.col(col)

        # Add sum expression to list
        volume_name_sum_expressions.append(volume_name_sum_expression.alias(volume_name))

    # Create df with selector columns and summed volume columns using expressions
    column_names_and_expressions: list[str | pl.Expr] = valid_selector_columns + volume_name_sum_expressions
    volumetric_across_fluid_zones_df = volumetric_df.select(column_names_and_expressions)

    return volumetric_across_fluid_zones_df


def _create_named_expression_with_nan_for_inf(expr: pl.Expr, name: str) -> pl.Expr:
    """
    Replace inf values with nan in a Polars expression and assign a new name

    returns: New expression with inf values replaced with nan and assigned a new name
    """
    return pl.when(expr.is_infinite()).then(np.nan).otherwise(expr).alias(name)


def create_property_column_expressions(
    volume_df_columns: list[str], properties: list[str], fluid_zone: FluidZone | None = None
) -> list[pl.Expr]:
    """
    Create Polars expressions for property columns base available volume columns.

    If one of the volume names needed for a property is not found, the property expressions is not provided

    Args:
    - volume_df_columns (list[str]): list of column names of volume pl.Dataframe
    - properties (list[str]): Name of the properties to calculate

    Returns:
    - list[pl.Expr]: list of Polars expressions for property columns

    """
    calculated_property_expressions: list[pl.Expr] = []

    # NOTE: If one of the volume names needed for a property is not found, the property array is not calculated
    # TODO: Consider "/"-operator vs pl.col().truediv() for division, e.g. pl.col("NET").truediv(pl.col("BULK"))
    if "BO" in properties and fluid_zone == FluidZone.OIL and set(["HCPV", "STOIIP"]).issubset(volume_df_columns):
        expression = pl.col("HCPV") / pl.col("STOIIP")
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(expression, "BO"))
    if "BG" in properties and fluid_zone == FluidZone.GAS and set(["HCPV", "GIIP"]).issubset(volume_df_columns):
        expression = pl.col("HCPV") / pl.col("GIIP")
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(expression, "BG"))
    if "NTG" in properties and set(["BULK", "NET"]).issubset(volume_df_columns):
        ntg_expression = pl.col("NET") / pl.col("BULK")
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(ntg_expression, "NTG"))
    if "PORO" in properties and set(["BULK", "PORV"]).issubset(volume_df_columns):
        poro_expression = pl.col("PORV") / pl.col("BULK")
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(poro_expression, "PORO"))
    if "PORO_NET" in properties and set(["PORV", "NET"]).issubset(volume_df_columns):
        poro_net_expression = pl.col("PORV") / pl.col("NET")
        calculated_property_expressions.append(
            _create_named_expression_with_nan_for_inf(poro_net_expression, "PORO_NET")
        )
    if "SW" in properties and set(["HCPV", "PORV"]).issubset(volume_df_columns):
        # NOTE: HCPV/PORV = 0/0 = Nan -> 1 - Nan = Nan, if HCPV = 0 and PORV = 0 -> SW = 1 it must be handled
        sw_expression = 1 - pl.col("HCPV") / pl.col("PORV")
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(sw_expression, "SW"))

    return calculated_property_expressions


def create_calculated_volume_column_expressions(
    volume_df_columns: list[str], calculated_volumes: list[str], fluid_zone: FluidZone | None = None
) -> list[pl.Expr]:
    """
    Create Polars expressions for calculated volume columns base available volume columns.

    Args:
    - volume_df_columns (list[str]): list of column names of volume pl.DataFrame
    - calculated_volumes (list[str]): Name of the volume column to calculate

    Returns:
    - list[pl.Expr]: list of Polars expressions for calculated volume columns

    """
    calculated_volume_expressions: list[pl.Expr] = []

    # Handle STOIIP_TOTAL and GIIP_TOTAL
    if "STOIIP_TOTAL" in calculated_volumes:
        stoiip_total_expression: pl.Expr | None = None
        if fluid_zone is None and set(["STOIIP", "ASSOCIATEDOIL"]).issubset(volume_df_columns):
            stoiip_total_expression = pl.col("STOIIP") + pl.col("ASSOCIATEDOIL")
        if fluid_zone == FluidZone.OIL and "STOIIP" in volume_df_columns:
            stoiip_total_expression = pl.col("STOIIP")
        if fluid_zone == FluidZone.GAS and "ASSOCIATEDOIL" in volume_df_columns:
            stoiip_total_expression = pl.col("ASSOCIATEDOIL")
        if stoiip_total_expression is not None:
            calculated_volume_expressions.append(
                _create_named_expression_with_nan_for_inf(stoiip_total_expression, "STOIIP_TOTAL")
            )
    if "GIIP_TOTAL" in calculated_volumes:
        giip_total_expression: pl.Expr | None = None
        if fluid_zone is None and set(["GIIP", "ASSOCIATEDGAS"]).issubset(volume_df_columns):
            giip_total_expression = pl.col("GIIP") + pl.col("ASSOCIATEDGAS")
        if fluid_zone == FluidZone.GAS and "GIIP" in volume_df_columns:
            giip_total_expression = pl.col("GIIP")
        if fluid_zone == FluidZone.OIL and "ASSOCIATEDGAS" in volume_df_columns:
            giip_total_expression = pl.col("ASSOCIATEDGAS")
        if giip_total_expression is not None:
            calculated_volume_expressions.append(
                _create_named_expression_with_nan_for_inf(giip_total_expression, "GIIP_TOTAL")
            )

    return calculated_volume_expressions
