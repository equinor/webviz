from typing import Dict, List, Tuple

import pyarrow as pa
import pyarrow.compute as pc
import numpy as np

from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    InplaceVolumetricTableData,
    InplaceVolumetricsIdentifier,
    InplaceStatisticalVolumetricTableData,
    RepeatedTableColumnData,
    Statistics,
    TableColumnData,
    TableColumnStatisticalData,
)

"""
This file contains general utility functions for the Inplace Volumetrics provider

The methods can be used to calculate, aggregate and create data for the Inplace Volumetrics provider
"""


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
    valid_selector_columns = [
        elm for elm in selector_columns if elm in per_realization_grouped_result_table.column_names
    ]
    valid_result_names = [
        elm for elm in per_realization_grouped_result_table.column_names if elm not in selector_columns
    ]

    # Convert to pandas dataframe for easier statistical aggregation
    df = per_realization_grouped_result_table.to_pandas()

    group_by_list = list(group_by_identifier_set)
    grouped = df.groupby(group_by_list)

    default_statistics_values_dict = {
        Statistics.MEAN: [],
        Statistics.STD_DEV: [],
        Statistics.MIN: [],
        Statistics.MAX: [],
        Statistics.P10: [],
        Statistics.P90: [],
    }

    group_by_columns: Dict[str, List[float]] = {column_name: [] for column_name in group_by_list}
    result_statistical_data_dict: Dict[str, TableColumnStatisticalData] = {
        result_name: TableColumnStatisticalData(
            column_name=result_name,
            statistic_values=default_statistics_values_dict.copy(),
        )
        for result_name in valid_result_names
    }

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

        # Calculate statistics for each result
        for result_name in valid_result_names:
            result_data = group[result_name]
            statistics_data = result_statistical_data_dict[result_name]  # NOTE: This is a reference to the dictionary

            statistics_data.statistic_values[Statistics.MEAN].append(result_data.mean())
            statistics_data.statistic_values[Statistics.STD_DEV].append(result_data.std())
            statistics_data.statistic_values[Statistics.MIN].append(result_data.min())
            statistics_data.statistic_values[Statistics.MAX].append(result_data.max())
            statistics_data.statistic_values[Statistics.P10].append(np.percentile(result_data, 10))
            statistics_data.statistic_values[Statistics.P90].append(np.percentile(result_data, 90))

    # Convert group by columns to repeated table column data
    selector_column_data_list: List[RepeatedTableColumnData] = []
    for column_name, column_values in group_by_columns.items():
        selector_column_data_list.append(
            _create_repeated_table_column_data_from_column(column_name, pa.array(column_values))
        )

    # Convert result statistical data to list
    result_statistical_data_list: List[TableColumnStatisticalData] = []
    for result_name, result_statistical_data in result_statistical_data_dict.items():
        result_statistical_data_list.append(result_statistical_data)

    # TODO: Verify length of each array in statistical data list?
    return (selector_column_data_list, result_statistical_data_list)


def create_statistical_grouped_result_table_data_pyarrow(
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
    valid_selector_columns = [
        elm for elm in selector_columns if elm in per_realization_grouped_result_table.column_names
    ]
    valid_result_names = [
        elm for elm in per_realization_grouped_result_table.column_names if elm not in selector_columns
    ]

    # Group table by group by identifiers
    table_grouped_by = per_realization_grouped_result_table.group_by(group_by_identifier_set)

    # Pyarrow statistical aggregation
    statistics_functions = ["mean", "stddev", "min", "max"]
    statistical_table = table_grouped_by.aggregate(
        [(result_name, func) for result_name in valid_result_names for func in statistics_functions]
    )

    # Build selector columns from statistical table
    selector_column_data_list: List[RepeatedTableColumnData] = []
    for column_name in valid_selector_columns:
        column_array = statistical_table[column_name]
        selector_column_data_list.append(_create_repeated_table_column_data_from_column(column_name, column_array))

    # Fill statistics for each result
    results_statistical_data_dict: Dict[str, TableColumnStatisticalData] = {}
    available_statistic_column_names = statistical_table.column_names
    for result_name in valid_result_names:
        result_statistical_data = TableColumnStatisticalData(column_name=result_name, statistic_values={})
        for func in statistics_functions:
            statistic_column_name = f"{result_name}_{func}"
            if statistic_column_name not in available_statistic_column_names:
                raise ValueError(f"Column {statistic_column_name} not found in statistical table")

            statistic_array = statistical_table[statistic_column_name]
            result_statistical_data.statistic_values[func] = statistic_array.to_pylist()
        results_statistical_data_dict[result_name] = result_statistical_data

    # Percentile calculation w/ TDigest
    # - Handle per percentile as resulting column name will be equal for each of the percentiles
    # NOTE: Assume equal order of groups for every .aggregate call
    tdigest_calculations = {"p90": pc.TDigestOptions([0.9]), "p10": pc.TDigestOptions([0.1])}
    for percentile_name, percentile_options in tdigest_calculations:
        percentile_table = table_grouped_by.aggregate(
            [(result_name, "tdigest", percentile_options) for result_name in valid_result_names]
        )

        available_percentile_column_names = percentile_table.column_names
        for result_name in valid_result_names:
            percentile_column_name = f"{result_name}_tdigest"

            if percentile_column_name not in available_percentile_column_names:
                raise ValueError(f"Column {percentile_column_name} not found in percentile table for {percentile_name}")

            result_statistical_data = results_statistical_data_dict.get(result_name)
            if result_statistical_data is None:
                raise ValueError(f"Expected result statistical data not found for {result_name}")

            percentile_array = percentile_table[percentile_column_name]
            result_statistical_data.statistic_values[percentile_name] = percentile_array.to_pylist()

    # Create list of results statistical data from dictionary values
    results_statistical_data_list: List[TableColumnStatisticalData] = list(results_statistical_data_dict.values())

    # TODO: Verify length of each array in statistical data list?
    return (selector_column_data_list, results_statistical_data_list)


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
