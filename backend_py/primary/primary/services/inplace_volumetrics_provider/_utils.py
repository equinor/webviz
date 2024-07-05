from typing import List

import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_types import (
    InplaceVolumetricTableData,
    InplaceVolumetricsIdentifier,
    RepeatedTableColumnData,
    TableColumnData,
)

"""
This file contains general utility functions for the Inplace Volumetrics provider

The methods can be used to calculate, aggregate and create data for the Inplace Volumetrics provider
"""


def create_accumulated_result_table(
    result_table: pa.Table,
    selector_columns: List[str],
    accumulate_by_identifiers: List[InplaceVolumetricsIdentifier],
    calculate_mean_across_realizations: bool,
) -> pa.Table:
    """
    Create accumulated result table based on selection
    """
    # Group by each of the identifier columns (always accumulate by realization - i.e. max one value per realization)
    accumulate_by_identifier_set = set([elm.value for elm in accumulate_by_identifiers])
    columns_to_group_by_for_sum = set(list(accumulate_by_identifier_set) + ["REAL"])

    valid_result_names = [elm for elm in result_table.column_names if elm not in selector_columns]

    # Aggregate sum for each result name after grouping
    accumulated_table = result_table.group_by(columns_to_group_by_for_sum).aggregate(
        [(result_name, "sum") for result_name in valid_result_names]
    )
    suffix_to_remove = "_sum"

    # Calculate mean across realizations
    if calculate_mean_across_realizations:
        accumulated_table = accumulated_table.group_by(accumulate_by_identifier_set).aggregate(
            [(f"{result_name}_sum", "mean") for result_name in valid_result_names]
        )
        suffix_to_remove = "_sum_mean"

    # Remove suffix from column names
    column_names_with_suffix = accumulated_table.column_names
    new_column_names = [column_name.replace(suffix_to_remove, "") for column_name in column_names_with_suffix]
    accumulated_table = accumulated_table.rename_columns(new_column_names)

    return accumulated_table


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
    present_selector_columns = [name for name in result_table.column_names if name in selector_columns]
    selector_column_data_list: List[RepeatedTableColumnData] = []
    for column_name in present_selector_columns:
        column_array = result_table[column_name]
        selector_column_data_list.append(_create_repeated_table_column_data_from_column(column_name, column_array))

    present_result_column_names = [name for name in result_table.column_names if name not in present_selector_columns]
    result_column_data_list: List[TableColumnData] = []
    for column_name in present_result_column_names:
        result_column_data_list.append(TableColumnData(column_name=column_name, values=result_table[column_name].to_numpy()))

    return InplaceVolumetricTableData(
        fluid_selection_name=selection_name,
        selector_columns=selector_column_data_list,
        result_columns=result_column_data_list,
    )
