from typing import Callable

import numpy as np
import polars as pl

from primary.services.sumo_access.inplace_volumes_table_types import (
    CalculatedVolume,
    Property,
    InplaceVolumes,
    InplaceVolumesTableData,
    InplaceVolumesResultName,
    RepeatedTableColumnData,
    Statistic,
    TableColumnData,
    TableColumnStatisticalData,
)

from primary.services.sumo_access.inplace_volumes_table_access import InplaceVolumesTableAccess

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
        if result_name in InplaceVolumesResultName.__members__:
            valid_result_names.append(result_name)
    return valid_result_names


def create_per_group_summed_realization_volume_df(
    volume_df: pl.DataFrame,
    group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
) -> pl.DataFrame:
    """
    Create volume DataFrame with sum per selected group. The sum volumes are grouped per realization, i.e. a column named "REAL"
    should always be among the output columns.

    Note that selector columns are not aggregated, only the volume columns are aggregated. Thus the selector columns not among
    group by indices is excluded from the output.

    After accumulating the sum, the properties can be calculated across realizations for each group.
    """
    if "REAL" not in volume_df.columns:
        raise ValueError("REAL column not found in volume DataFrame")

    # Group by each of the indices (always accumulate by realization - i.e. max one value per realization)
    columns_to_group_by_for_sum = ["REAL"]
    if group_by_indices:
        columns_to_group_by_for_sum = list({elm.value for elm in group_by_indices} | {"REAL"})

    # Selector columns should not be aggregated
    possible_selector_columns = InplaceVolumesTableAccess.get_selector_column_names()

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
    possible_selector_columns = InplaceVolumesTableAccess.get_selector_column_names()

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
    group_by_indices: list[InplaceVolumes.TableIndexColumns] | None,
) -> tuple[list[RepeatedTableColumnData], list[TableColumnStatisticalData]]:
    """
    Create result table data with statistics across column values based on group by indices selection. The
    statistics are calculated across all values per grouping, thus the output will have one row per group.

    To get statistics across all realizations, the input result df must be pre-processed to contain non-duplicate "REAL" values
    per group when grouping with group_by_indices.

    The order of the arrays in the statistical data lists will match the order of the rows in the selector column data list.

    Statistics: Mean, stddev, min, max, p10, p90

    Parameters:
    - result_df: Dataframe with selector columns and result columns
    - group_by_indices: list of indices to group by, should be equal to the group by used used to pre-process the input result df

    Returns:
    - Tuple with selector column data list and results statistical data list
    """
    if group_by_indices == []:
        raise ValueError("Group by indices must be a non-empty list or None")

    possible_selector_columns = InplaceVolumesTableAccess.get_selector_column_names()
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
    if group_by_indices is None:
        # If no grouping, aggregate entire df using expressions in select
        # Only keep the result name columns and its statistics (i.e. keep no index columns)
        per_group_statistical_df = result_df.select(statistic_aggregation_expressions)
    else:
        group_by_indices_values = list(set([elm.value for elm in group_by_indices]))
        # Perform aggregation per grouping
        per_group_statistical_df = (
            result_df.select(group_by_indices_values + valid_result_names)
            .group_by(group_by_indices_values)
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
) -> InplaceVolumesTableData:
    """
    Create Inplace Volumetric Table Data from result DataFrame, selection name and specified selector columns
    """
    if result_df.is_empty():
        return InplaceVolumesTableData(fluid_selection_name=selection_name, selector_columns=[], result_columns=[])

    possible_selector_columns = InplaceVolumesTableAccess.get_selector_column_names()
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

    return InplaceVolumesTableData(
        fluid_selection_name=selection_name,
        selector_columns=selector_column_data_list,
        result_columns=result_column_data_list,
    )


def create_inplace_volumes_df_per_fluid(
    inplace_volumes_table_df: pl.DataFrame,
) -> dict[InplaceVolumes.Fluid, pl.DataFrame]:
    """
    Create an inplace volumes table DataFrame per fluid

    Groups the inplace volumes table DataFrame by fluid and stores a new DataFrame, excluding the fluid column, for each fluid in a dictionary.

    Returns:
    dict[InplaceVolumes.Fluid, pl.DataFrame]: A dictionary with fluid as key and inplace volumes DataFrame as value

    """
    column_names: list[str] = inplace_volumes_table_df.columns

    if InplaceVolumes.TableIndexColumns.FLUID.value not in column_names:
        raise ValueError("FLUID column is required in volumetric DataFrame")

    # Iterate over column_names to keep order of inplace_volumes_table_df.columns
    column_to_exclude = InplaceVolumes.TableIndexColumns.FLUID.value
    columns_to_include = [col for col in column_names if col != column_to_exclude]

    fluid_to_df_map: dict[InplaceVolumes.Fluid, pl.DataFrame] = {}
    for group_name, grouped_df in inplace_volumes_table_df.group_by(
        InplaceVolumes.TableIndexColumns.FLUID.value
    ):  # , maintain_order=True):
        fluid = InplaceVolumes.Fluid(group_name[0])

        # DataFrame with all columns except the FLUID column
        fluid_to_df_map[fluid] = grouped_df.select(columns_to_include)

    return fluid_to_df_map


def create_inplace_volumes_summed_fluids_df(
    inplace_volumes_table_df: pl.DataFrame,
) -> pl.DataFrame:
    """
    Creating an inplace volumes table DataFrame summed across selected fluids

    Creates a new DataFrame where each fluid per volume column is summed, with matching index columns and REAL column as the original table.

    The fluid columns are removed from the resulting DataFrame.

    Note: This function assumes that the inplace_volumes_table_df has a column named "FLUID", and is already filtered
    to contain only the fluids of interest.


    Example:
    - Input:
        - inplace_volumes_table_df: pl.DataFrame
            - inplace_volumes_table_df.columns = ["REAL", "FLUID", "ZONE", "REGION", "FACIES", "STOIIP", "GIIP", "HCPV"]

    - Output:
        - volumes_summed_across_fluids_df: pl.DataFrame
            - volumes_summed_across_fluids_df.columns = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "GIIP", "HCPV"]
    """

    column_names = inplace_volumes_table_df.columns

    if InplaceVolumes.TableIndexColumns.FLUID.value not in column_names:
        raise ValueError("FLUID column is required in inplace volumes table DataFrame")

    # Iterate over columns to keep order of inplace_volumes_table_df columns
    selector_columns = [col for col in column_names if col in InplaceVolumesTableAccess.get_selector_column_names()]
    volumetric_columns = [col for col in column_names if col not in selector_columns]
    group_by_columns = [col for col in selector_columns if col != InplaceVolumes.TableIndexColumns.FLUID.value]

    # Group by the index columns except fluid and sum the volumetric columns
    volumes_summed_across_fluids_df = inplace_volumes_table_df.group_by(group_by_columns).agg(
        [pl.col(col).sum().alias(col) for col in volumetric_columns if col not in selector_columns]
    )

    return volumes_summed_across_fluids_df


def _create_named_expression_with_nan_for_inf(expr: pl.Expr, name: str) -> pl.Expr:
    """
    Replace inf values with nan in a Polars expression and assign a new name

    returns: New expression with inf values replaced with nan and assigned a new name
    """
    return pl.when(expr.is_infinite()).then(np.nan).otherwise(expr).alias(name)


def create_property_column_expressions(
    volume_df_columns: list[str], properties: list[str], fluid: InplaceVolumes.Fluid | None = None
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

    # If one of the volume names needed for a property is not found, the property array is not calculated
    if (
        Property.BO in properties
        and fluid == InplaceVolumes.Fluid.oil
        and set([InplaceVolumes.VolumetricColumns.HCPV, InplaceVolumes.VolumetricColumns.STOIIP]).issubset(
            volume_df_columns
        )
    ):
        expression = pl.col(InplaceVolumes.VolumetricColumns.HCPV.value) / pl.col(
            InplaceVolumes.VolumetricColumns.STOIIP.value
        )
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(expression, Property.BO.value))

    if (
        Property.BG in properties
        and fluid == InplaceVolumes.Fluid.gas
        and set([InplaceVolumes.VolumetricColumns.HCPV, InplaceVolumes.VolumetricColumns.GIIP]).issubset(
            volume_df_columns
        )
    ):
        expression = pl.col(InplaceVolumes.VolumetricColumns.HCPV.value) / pl.col(
            InplaceVolumes.VolumetricColumns.GIIP.value
        )
        calculated_property_expressions.append(_create_named_expression_with_nan_for_inf(expression, Property.BG.value))

    if Property.NTG in properties and set(
        [InplaceVolumes.VolumetricColumns.BULK, InplaceVolumes.VolumetricColumns.NET]
    ).issubset(volume_df_columns):
        ntg_expression = pl.col(InplaceVolumes.VolumetricColumns.NET.value) / pl.col(
            InplaceVolumes.VolumetricColumns.BULK.value
        )
        calculated_property_expressions.append(
            _create_named_expression_with_nan_for_inf(ntg_expression, Property.NTG.value)
        )

    if Property.PORO in properties and set(
        [InplaceVolumes.VolumetricColumns.BULK, InplaceVolumes.VolumetricColumns.PORV]
    ).issubset(volume_df_columns):
        poro_expression = pl.col(InplaceVolumes.VolumetricColumns.PORV.value) / pl.col(
            InplaceVolumes.VolumetricColumns.BULK.value
        )
        calculated_property_expressions.append(
            _create_named_expression_with_nan_for_inf(poro_expression, Property.PORO.value)
        )

    if Property.PORO_NET in properties and set(
        [InplaceVolumes.VolumetricColumns.PORV, InplaceVolumes.VolumetricColumns.NET]
    ).issubset(volume_df_columns):
        poro_net_expression = pl.col(InplaceVolumes.VolumetricColumns.PORV.value) / pl.col(
            InplaceVolumes.VolumetricColumns.NET.value
        )
        calculated_property_expressions.append(
            _create_named_expression_with_nan_for_inf(poro_net_expression, Property.PORO_NET.value)
        )

    if Property.SW in properties and set(
        [InplaceVolumes.VolumetricColumns.HCPV, InplaceVolumes.VolumetricColumns.PORV]
    ).issubset(volume_df_columns):
        # NOTE: HCPV/PORV = 0/0 = Nan -> 1 - Nan = Nan, if HCPV = 0 and PORV = 0 -> SW = 1 it must be handled
        sw_expression = 1 - pl.col(InplaceVolumes.VolumetricColumns.HCPV.value) / pl.col(
            InplaceVolumes.VolumetricColumns.PORV.value
        )
        calculated_property_expressions.append(
            _create_named_expression_with_nan_for_inf(sw_expression, Property.SW.value)
        )

    return calculated_property_expressions


def create_calculated_volume_column_expressions(
    volume_df_columns: list[str], calculated_volumes: list[str], fluid: InplaceVolumes.Fluid | None = None
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
    if CalculatedVolume.STOIIP_TOTAL in calculated_volumes:
        stoiip_total_expression: pl.Expr | None = None
        if fluid is None and set(["STOIIP", "ASSOCIATEDOIL"]).issubset(volume_df_columns):
            stoiip_total_expression = pl.col("STOIIP") + pl.col("ASSOCIATEDOIL")
        if fluid == InplaceVolumes.Fluid.oil and "STOIIP" in volume_df_columns:
            stoiip_total_expression = pl.col("STOIIP")
        if fluid == InplaceVolumes.Fluid.gas and "ASSOCIATEDOIL" in volume_df_columns:
            stoiip_total_expression = pl.col("ASSOCIATEDOIL")
        if stoiip_total_expression is not None:
            calculated_volume_expressions.append(
                _create_named_expression_with_nan_for_inf(stoiip_total_expression, "STOIIP_TOTAL")
            )
    if CalculatedVolume.GIIP_TOTAL in calculated_volumes:
        giip_total_expression: pl.Expr | None = None
        if fluid is None and set(["GIIP", "ASSOCIATEDGAS"]).issubset(volume_df_columns):
            giip_total_expression = pl.col("GIIP") + pl.col("ASSOCIATEDGAS")
        if fluid == InplaceVolumes.Fluid.gas and "GIIP" in volume_df_columns:
            giip_total_expression = pl.col("GIIP")
        if fluid == InplaceVolumes.Fluid.oil and "ASSOCIATEDGAS" in volume_df_columns:
            giip_total_expression = pl.col("ASSOCIATEDGAS")
        if giip_total_expression is not None:
            calculated_volume_expressions.append(
                _create_named_expression_with_nan_for_inf(giip_total_expression, "GIIP_TOTAL")
            )

    return calculated_volume_expressions


def remove_invalid_optional_index_columns(inplace_volumes_df: pl.DataFrame) -> pl.DataFrame:
    """
    Remove invalid optional index columns from inplace volumes DataFrame

    Invalid when the column only contains Nan values or null values.

    Args:
    - inplace_volumes_df (pl.DataFrame): Inplace volumes DataFrame

    Returns:
    - pl.DataFrame: Inplace volumes DataFrame with invalid optional index columns removed
    """

    column_names = inplace_volumes_df.columns
    optional_index_column_names = set(InplaceVolumesTableAccess.get_index_column_names()) - set(
        InplaceVolumesTableAccess.get_required_index_column_names()
    )
    for column in optional_index_column_names:
        if column in column_names and _are_all_column_values_null_or_nan(inplace_volumes_df, column):
            inplace_volumes_df = inplace_volumes_df.drop(column)

    return inplace_volumes_df


def _are_all_column_values_null_or_nan(df: pl.DataFrame, column: str) -> bool:
    if column not in df.columns:
        raise ValueError(f"Column {column} not found in DataFrame")

    dtype = df.schema[column]
    is_float = dtype in (pl.Float32, pl.Float64)

    if is_float:
        validation_mask = pl.col(column).is_null() | pl.col(column).is_nan()
        return df.select(validation_mask).to_series().all()

    validation_mask = pl.col(column).is_null()
    return df.select(validation_mask).to_series().all()
