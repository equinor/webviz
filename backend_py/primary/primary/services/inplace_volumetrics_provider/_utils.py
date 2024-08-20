from typing import Dict, List, Tuple

import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import numpy as np

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

"""
This file contains general utility functions for the Inplace Volumetrics provider

The methods can be used to calculate, aggregate and create data for the Inplace Volumetrics provider
"""


def get_valid_result_names_from_list(result_names: List[str]) -> List[str]:
    """
    Get valid result names from list of result names
    """
    valid_result_names = []
    for result_name in result_names:
        if result_name in InplaceVolumetricResultName.__members__:
            valid_result_names.append(result_name)
    return valid_result_names


def create_per_realization_accumulated_result_table(
    result_table: pa.Table,
    selector_columns: List[str],
    group_by_identifiers: List[InplaceVolumetricsIdentifier],
) -> pa.Table:
    """
    Create result table with accumulated sum based on group by identifiers selection. The sum results are grouped per realization,
    i.e. a column named "REAL" should always be among the output columns
    """
    # Group by each of the identifier (always accumulate by realization - i.e. max one value per realization)
    group_by_identifier_set = set([elm.value for elm in group_by_identifiers])
    columns_to_group_by_for_sum = set(list(group_by_identifier_set) + ["REAL"])

    valid_result_names = [elm for elm in result_table.column_names if elm not in selector_columns]

    # Aggregate sum for each result name after grouping
    accumulated_table = result_table.group_by(columns_to_group_by_for_sum).aggregate(
        [(result_name, "sum") for result_name in valid_result_names]
    )
    suffix_to_remove = "_sum"

    # Remove suffix from column names
    column_names_with_suffix = accumulated_table.column_names
    new_column_names = [column_name.replace(suffix_to_remove, "") for column_name in column_names_with_suffix]
    accumulated_table = accumulated_table.rename_columns(new_column_names)

    return accumulated_table


def create_statistical_grouped_result_table_data_pandas(
    result_table: pa.Table,
    selector_columns: List[str],
    group_by_identifiers: List[InplaceVolumetricsIdentifier],
) -> Tuple[List[RepeatedTableColumnData], List[TableColumnStatisticalData]]:
    """
    Create result table with statistics across realizations based on group by identifiers selection. The
    statistics are calculated across all realizations per grouping, thus the output will have one row per group.

    Statistics: Mean, stddev, min, max, p10, p90

    TODO: Add p10 and p90 later on (find each "group" (how to?) and filter table to get respective rows. Thereafter pick the column to calc p10 and p90?)
    """
    group_by_identifier_set = set([elm.value for elm in group_by_identifiers])

    # Get grouped result table with individual realizations
    per_realization_grouped_result_table = create_per_realization_accumulated_result_table(
        result_table, selector_columns, group_by_identifiers
    )
    valid_result_names = [
        elm for elm in per_realization_grouped_result_table.column_names if elm not in selector_columns
    ]

    # Convert to pandas dataframe for easier statistical aggregation
    dataframe = per_realization_grouped_result_table.to_pandas()

    # Internal working data structures
    group_by_list = list(group_by_identifier_set)
    group_by_columns: Dict[str, List[float]] = {column_name: [] for column_name in group_by_list}
    result_statistical_data_dict: Dict[str, TableColumnStatisticalData] = {
        result_name: TableColumnStatisticalData(
            column_name=result_name,
            statistic_values={
                Statistic.MEAN: [],
                Statistic.STD_DEV: [],
                Statistic.MIN: [],
                Statistic.MAX: [],
                Statistic.P10: [],
                Statistic.P90: [],
            },
        )
        for result_name in valid_result_names
    }

    # Output data structures
    selector_column_data_list: List[RepeatedTableColumnData] = []
    result_statistical_data_list: List[TableColumnStatisticalData] = []

    def _calculate_and_append_statistics_per_group(group_df: pd.DataFrame):
        for result_name in valid_result_names:
            result_column_array = group_df[result_name].to_numpy()
            statistics_data = result_statistical_data_dict[result_name]  # Get reference to dictionary

            statistics_data.statistic_values[Statistic.MEAN].append(np.mean(result_column_array))
            statistics_data.statistic_values[Statistic.STD_DEV].append(np.std(result_column_array))
            statistics_data.statistic_values[Statistic.MIN].append(np.min(result_column_array))
            statistics_data.statistic_values[Statistic.MAX].append(np.max(result_column_array))
            statistics_data.statistic_values[Statistic.P10].append(np.percentile(result_column_array, 10))
            statistics_data.statistic_values[Statistic.P90].append(np.percentile(result_column_array, 90))

    # Handle case where group by identifiers are empty
    if len(group_by_list) == 0:
        _calculate_and_append_statistics_per_group(dataframe)

    else:

        # NOTE: If group by identifiers are empty, the groupby will fail with an error
        grouped = dataframe.groupby(group_by_list)

        # Iterate over each group and extract group by column values and calculate statistics for each result
        for keys, group in grouped:
            if len(keys) != len(group_by_columns.keys()):
                raise ValueError(
                    f"Number of group by keys {len(keys)} does not match number of group by columns {len(group_by_columns.keys())}"
                )

            # Get group by column values
            for index, key in enumerate(keys):
                column_name = group_by_list[index]
                group_by_columns[column_name].append(key)

            # Calculate and append statistics for group
            _calculate_and_append_statistics_per_group(group)

        # Convert group by columns to repeated table column data
        for column_name, column_values in group_by_columns.items():
            selector_column_data_list.append(
                _create_repeated_table_column_data_from_column(column_name, pa.array(column_values))
            )

    # Convert result statistical data to list
    for result_statistical_data in result_statistical_data_dict.values():
        result_statistical_data_list.append(result_statistical_data)

    # TODO: Verify length of each array in statistical data list?
    return (selector_column_data_list, result_statistical_data_list)


def _get_statistic_enum_from_pyarrow_aggregate_func_name(func: str) -> Statistic:
    """
    Get statistic enum from pyarrow aggregate function name
    """
    if func == "mean":
        return Statistic.MEAN
    if func == "stddev":
        return Statistic.STD_DEV
    if func == "min":
        return Statistic.MIN
    if func == "max":
        return Statistic.MAX
    if func == "p10":
        return Statistic.P10
    if func == "p90":
        return Statistic.P90

    raise ValueError(f"Unknown statistic function name: {func}")


def create_statistical_grouped_result_table_data_pyarrow(
    result_table: pa.Table,
    selector_columns: List[str],
    group_by_identifiers: List[InplaceVolumetricsIdentifier],
) -> Tuple[List[RepeatedTableColumnData], List[TableColumnStatisticalData]]:
    """
    Create result table with statistics across realizations based on group by identifiers selection. The
    statistics are calculated across all realizations per grouping, thus the output will have one row per group.

    The order of the arrays in the statistical data lists will match the order of the rows in the selector column data list.

    Statistics: Mean, stddev, min, max, p10, p90
    """
    group_by_identifier_set = set([elm.value for elm in group_by_identifiers])

    # Get grouped result table with individual realizations
    per_realization_grouped_result_table = create_per_realization_accumulated_result_table(
        result_table, selector_columns, group_by_identifiers
    )
    valid_selector_columns = [
        elm for elm in selector_columns if elm in per_realization_grouped_result_table.column_names
    ]
    valid_result_names = [
        elm for elm in per_realization_grouped_result_table.column_names if elm not in selector_columns
    ]

    # Group table by group by identifiers
    table_grouped_by = per_realization_grouped_result_table.group_by(group_by_identifier_set)

    # Pyarrow statistical aggregation
    # - Each statistical aggregation will result in a new column with the result name and function name as suffix
    # - E.g. "result_name_mean" = [1,2,3,4], with a group by giving 4 groups.
    basic_statistics_functions = ["mean", "stddev", "min", "max"]
    basic_statistics_aggregations = [
        (result_name, func) for result_name in valid_result_names for func in basic_statistics_functions
    ]

    # Percentile calculation w/ TDigest
    # - The tdigest aggregation will result in a new column with the result name and "tdigest" as suffix,
    #   where each element of the column is an array with the requested percentiles in TDigestOptions.
    # - E.g: "result_name_tdigest" = [[1,2], [1.5, 2.5], [2,3] [2.5,3.5]], with a group by giving 4 groups. First element is p10, second is p90
    # - Note: If only 1 group, the result will be a single array with 2 elements - e.g. [1,2]
    tdigest_options = pc.TDigestOptions([0.1, 0.9])  # p10 and p90
    percentile_aggregations = [(result_name, "tdigest", tdigest_options) for result_name in valid_result_names]

    # Create statistical table aggregation
    statistical_aggregations = basic_statistics_aggregations + percentile_aggregations
    statistical_table = table_grouped_by.aggregate(statistical_aggregations)

    # Build selector columns from statistical table
    selector_column_data_list: List[RepeatedTableColumnData] = []
    final_selector_columns = [name for name in statistical_table.column_names if name in valid_selector_columns]
    for column_name in final_selector_columns:
        column_array = statistical_table[column_name]
        selector_column_data_list.append(_create_repeated_table_column_data_from_column(column_name, column_array))

    # Fill statistics for each result
    results_statistical_data_dict: Dict[str, TableColumnStatisticalData] = {}
    available_statistic_column_names = statistical_table.column_names
    for result_name in valid_result_names:
        result_statistical_data = TableColumnStatisticalData(column_name=result_name, statistic_values={})

        # Handle basic statistics
        for func in basic_statistics_functions:
            statistic_column_name = f"{result_name}_{func}"
            if statistic_column_name not in available_statistic_column_names:
                raise ValueError(f"Column {statistic_column_name} not found in statistical table")

            statistic_enum = _get_statistic_enum_from_pyarrow_aggregate_func_name(func)
            statistic_array = statistical_table[statistic_column_name]
            result_statistical_data.statistic_values[statistic_enum] = statistic_array.to_pylist()

        # Handle percentile statistics
        percentile_column_name = f"{result_name}_tdigest"
        if percentile_column_name not in available_statistic_column_names:
            raise ValueError(f"Column {percentile_column_name} not found in statistical table")

        p10_array = []
        p90_array = []
        percentiles_array = statistical_table[percentile_column_name]
        get_valid_percentile_value = lambda elm: elm.as_py() if elm.as_py() is not None else np.nan
        if len(group_by_identifier_set) == 0:
            p10_array = [get_valid_percentile_value(percentiles_array[0])]
            p90_array = [get_valid_percentile_value(percentiles_array[1])]
        else:
            for group_percentiles in percentiles_array:
                if len(group_percentiles) != 2:
                    raise ValueError(f"Expected 2 elements in percentile array, got {len(group_percentiles)}")

                p10_array.append(get_valid_percentile_value(group_percentiles[0]))
                p90_array.append(get_valid_percentile_value(group_percentiles[1]))
        result_statistical_data.statistic_values[Statistic.P10] = p10_array
        result_statistical_data.statistic_values[Statistic.P90] = p90_array

        # Add result statistical data to dictionary
        results_statistical_data_dict[result_name] = result_statistical_data

    # Create list of results statistical data from dictionary values
    results_statistical_data_list: List[TableColumnStatisticalData] = list(results_statistical_data_dict.values())

    # Validate length of columns
    _validate_length_of_statistics_data_lists(selector_column_data_list, results_statistical_data_list)

    return (selector_column_data_list, results_statistical_data_list)


def _validate_length_of_statistics_data_lists(
    selector_column_data_list: List[RepeatedTableColumnData],
    result_statistical_data_list: List[TableColumnStatisticalData],
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
                f"Length of selector column data list ({num_rows}) does not match expected number of rows ({expected_num_rows})"
            )
    for result_statistical_data in result_statistical_data_list:
        for statistic, statistic_values in result_statistical_data.statistic_values.items():
            if len(statistic_values) != expected_num_rows:
                result_name = result_statistical_data.column_name
                raise ValueError(
                    f"Number of {result_name} statistic {statistic.value} values does not match expected number of rows: {expected_num_rows}. Got: {len(statistic_values)}"
                )


def _create_repeated_table_column_data_from_column(
    column_name: str, column_values: pa.array
) -> RepeatedTableColumnData:
    """
    Create repeated table column data from column name and values array
    """
    unique_values: List[str | int] = list(pc.unique(column_values).to_pylist())
    value_to_index_map = {value: index for index, value in enumerate(unique_values)}
    indices: List[int] = [value_to_index_map[value] for value in column_values.to_pylist()]

    return RepeatedTableColumnData(column_name=column_name, unique_values=unique_values, indices=indices)


def create_inplace_volumetric_table_data_from_result_table(
    result_table: pa.Table, selection_name: str, selector_columns: List[str]
) -> InplaceVolumetricTableData:
    """
    Create Inplace Volumetric Table Data from result table, selection name and specified selector columns
    """
    existing_selector_columns = [name for name in result_table.column_names if name in selector_columns]
    selector_column_data_list: List[RepeatedTableColumnData] = []
    for column_name in existing_selector_columns:
        column_array = result_table[column_name]
        selector_column_data_list.append(_create_repeated_table_column_data_from_column(column_name, column_array))

    existing_result_column_names = [name for name in result_table.column_names if name not in existing_selector_columns]
    result_column_data_list: List[TableColumnData] = []
    for column_name in existing_result_column_names:
        result_column_data_list.append(
            TableColumnData(column_name=column_name, values=result_table[column_name].to_numpy())
        )

    return InplaceVolumetricTableData(
        fluid_selection_name=selection_name,
        selector_columns=selector_column_data_list,
        result_columns=result_column_data_list,
    )


def create_volumetric_table_accumulated_across_fluid_zones(
    volumetric_table_per_fluid_zone: Dict[FluidZone, pa.Table], selector_columns: List[str]
) -> pa.Table:
    """
    Create a table that is the sum of all tables in table_per_fluid_zone

    NOTE: Expect all tables to have the same selector columns and order, i.e. row wise compare is possible
    """
    if len(volumetric_table_per_fluid_zone) == 0:
        raise ValueError("No tables found in table_per_fluid_zone")

    # Find union of column names across all fluid zones
    all_column_names = set()
    for response_table in volumetric_table_per_fluid_zone.values():
        all_column_names.update(response_table.column_names)

    selector_columns = set(selector_columns)
    remaining_column_names = all_column_names - set(selector_columns)

    first_table = next(iter(volumetric_table_per_fluid_zone.values()))
    accumulated_table = first_table.select(selector_columns)
    zero_array = pa.array([0.0] * accumulated_table.num_rows, type=pa.float64())
    for column_name in remaining_column_names:
        accumulated_column_array: List[pa.array] = zero_array
        for response_table in volumetric_table_per_fluid_zone.values():
            if column_name in response_table.column_names:
                accumulated_column_array = pc.add(accumulated_column_array, response_table[column_name])
        accumulated_table = accumulated_table.append_column(column_name, accumulated_column_array)

    return accumulated_table