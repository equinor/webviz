from typing import Dict, List, Optional, Tuple

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
    Property,
)

from ._conversion._conversion import get_properties_among_result_names

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess

"""
This file contains general utility functions for the Inplace Volumetrics provider

The methods can be used to calculate, aggregate and create data for the Inplace Volumetrics provider
"""


def create_array_with_nan_for_null(array: pa.array) -> pa.array:
    """
    Replace null with np.nan
    """
    null_mask = pc.is_null(array)
    if not pc.any(null_mask):
        return array

    return pc.if_else(null_mask, float("nan"), array)


def _create_safe_denominator_array(denominator_array: pa.array) -> pa.array:
    """
    Create denominator array for safe division, i.e. replace 0 with np.nan
    """
    zero_mask = pc.equal(denominator_array, 0.0)
    safe_denominator_array = pc.if_else(zero_mask, float("nan"), denominator_array)
    return safe_denominator_array


def _replace_nan_and_inf_with_null(array: pa.array) -> pa.array:
    """
    Replace NaN and Inf with null, this is needed for pyarrow to handle null values in aggregation

    The None value is used to represent null values in pyarrow array

    NOTE: if pyarrow is removed, this replacement is probably not needed
    """
    nan_or_inf_mask = pc.or_(pc.is_nan(array), pc.is_inf(array))
    return pc.if_else(nan_or_inf_mask, None, array)


def calculate_property_from_volume_arrays(property: str, nominator: pa.array, denominator: pa.array) -> pa.array:
    """
    Calculate property from two arrays of volumes

    Assume equal length and dimension of arrays

    """
    safe_denominator = _create_safe_denominator_array(denominator)

    result = None
    if property == Property.NTG.value:
        result = pc.divide(nominator, safe_denominator)
    if property == Property.PORO.value:
        result = pc.divide(nominator, safe_denominator)
    if property == Property.PORO_NET.value:
        result = pc.divide(nominator, safe_denominator)
    if property == Property.SW.value:
        result = pc.subtract(1, pc.divide(nominator, safe_denominator))
    if property == Property.BO.value:
        result = pc.divide(nominator, safe_denominator)
    if property == Property.BG.value:
        result = pc.divide(nominator, safe_denominator)

    if result is not None:
        # return result
        return _replace_nan_and_inf_with_null(result)

    ValueError(f"Unhandled property: {property}")


def get_valid_result_names_from_list(result_names: List[str]) -> List[str]:
    """
    Get valid result names from list of result names
    """
    valid_result_names = []
    for result_name in result_names:
        if result_name in InplaceVolumetricResultName.__members__:
            valid_result_names.append(result_name)
    return valid_result_names


def create_per_realization_accumulated_volume_table(
    volume_table: pa.Table,
    group_by_identifiers: List[InplaceVolumetricsIdentifier],
) -> pa.Table:
    """
    Create volume table with accumulated sum based on group by identifiers selection. The sum volumes are grouped per realization,
    i.e. a column named "REAL" should always be among the output columns

    After accumulating the sum, the properties can be calculated across realizations for each group.
    """
    # Group by each of the identifier (always accumulate by realization - i.e. max one value per realization)
    group_by_identifier_set = set([elm.value for elm in group_by_identifiers])
    columns_to_group_by_for_sum = set(list(group_by_identifier_set) + ["REAL"])

    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    valid_volume_names = [elm for elm in volume_table.column_names if elm not in possible_selector_columns]

    # Aggregate sum for each result name after grouping
    accumulated_table = volume_table.group_by(columns_to_group_by_for_sum).aggregate(
        [(volume_name, "sum") for volume_name in valid_volume_names]
    )
    suffix_to_remove = "_sum"

    # Remove suffix from column names
    column_names_with_suffix = accumulated_table.column_names
    new_column_names = [column_name.replace(suffix_to_remove, "") for column_name in column_names_with_suffix]
    accumulated_table = accumulated_table.rename_columns(new_column_names)

    return accumulated_table


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


def create_grouped_statistical_result_table_data_pyarrow(
    per_realization_accumulated_result_table: pa.Table,
    group_by_identifiers: List[InplaceVolumetricsIdentifier],
) -> Tuple[List[RepeatedTableColumnData], List[TableColumnStatisticalData]]:
    """
    Create result table with statistics across realizations based on group by identifiers selection. The
    statistics are calculated across all realizations per grouping, thus the output will have one row per group.

    The order of the arrays in the statistical data lists will match the order of the rows in the selector column data list.

    Statistics: Mean, stddev, min, max, p10, p90

    Parameters:
    - per_realization_accumulated_result_table: Table with accumulated results per realization
    - group_by_identifiers: List of identifiers to group by, must be equal to the group by used for accumulating the result table

    Returns:
    - Tuple with selector column data list and results statistical data list
    """
    if "REAL" not in per_realization_accumulated_result_table.column_names:
        raise ValueError("REAL column not found in accumulated result table")

    group_by_identifier_set = set([elm.value for elm in group_by_identifiers])

    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    valid_selector_columns = [
        elm for elm in possible_selector_columns if elm in per_realization_accumulated_result_table.column_names
    ]

    # Find valid result names in table
    valid_result_names = [
        elm for elm in per_realization_accumulated_result_table.column_names if elm not in valid_selector_columns
    ]

    # Group table by group by identifiers
    table_grouped_by = per_realization_accumulated_result_table.group_by(group_by_identifier_set)

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
            statistic_array = create_array_with_nan_for_null(statistical_table[statistic_column_name])
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
        
        # Invert P10 and P90 according to oil industry standards
        result_statistical_data.statistic_values[Statistic.P10] = p90_array
        result_statistical_data.statistic_values[Statistic.P90] = p10_array

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
    result_table: pa.Table, selection_name: str
) -> InplaceVolumetricTableData:
    """
    Create Inplace Volumetric Table Data from result table, selection name and specified selector columns
    """
    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    existing_selector_columns = [name for name in result_table.column_names if name in possible_selector_columns]
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


def create_volumetric_table_per_fluid_zone(
    fluid_zones: List[FluidZone],
    volumetric_table: pa.Table,
) -> Dict[FluidZone, pa.Table]:
    """
    Create a volumetric table per fluid zone

    Extracts the columns for each fluid zone and creates a new table for each fluid zone, with
    the same identifier columns and REAL column as the original table.

    The fluid columns are stripped of the fluid zone suffix.

    Returns:
    Dict[FluidZone, pa.Table]: A dictionary with fluid zone as key and volumetric table as value


    Example:
    - Input:
        - fluid_zone: [FluidZone.OIL, FluidZone.GAS]
        - volumetric_table: pa.Table
            - volumetric_table.column_names = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]

    - Output:
        - table_dict: Dict[FluidZone, pa.Table]:
            - table_dict[FluidZone.OIL]: volumetric_table_oil
                - volumetric_table_oil.column_names = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "HCPV"]
            - table_dict[FluidZone.GAS]: volumetric_table_gas
                - volumetric_table_gas.column_names = ["REAL", "ZONE", "REGION", "FACIES", "GIIP", "HCPV"]

    """
    column_names: List[str] = volumetric_table.column_names

    possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
    selector_columns = [col for col in possible_selector_columns if col in column_names]

    fluid_zone_to_table_map: Dict[FluidZone, pa.Table] = {}
    for fluid_zone in fluid_zones:
        fluid_zone_name = fluid_zone.value.upper()
        fluid_columns = [name for name in column_names if name.endswith(f"_{fluid_zone_name}")]

        if not fluid_columns:
            continue

        fluid_zone_table = volumetric_table.select(selector_columns + fluid_columns)

        # Remove fluid_zone suffix from columns of fluid_zone_table
        new_column_names = [elm.replace(f"_{fluid_zone_name}", "") for elm in fluid_zone_table.column_names]
        fluid_zone_table = fluid_zone_table.rename_columns(new_column_names)

        fluid_zone_to_table_map[fluid_zone] = fluid_zone_table
    return fluid_zone_to_table_map


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


def calculate_property_column_arrays(
    volumetric_table: pa.Table, properties: List[str], fluid_zone: Optional[FluidZone] = None
) -> Dict[str, pa.array]:
    """
    Calculate property arrays as pa.array based on the available volume columns in table.

    If one of the volume names needed for a property is not found, the property array is not calculated

    Args:
    - volumetric_table (pa.Table): Table with volumetric data
    - properties (List[str]): Name of the properties to calculate

    Returns:
    - Dict[str, pa.array]: Property as key, and array with calculated property values as value

    """

    existing_volume_columns: List[str] = volumetric_table.column_names
    property_arrays: Dict[str, pa.array] = {}

    # NOTE: If one of the volume names needed for a property is not found, the property array is not calculated

    if fluid_zone == FluidZone.OIL and "BO" in properties and set(["HCPV", "STOIIP"]).issubset(existing_volume_columns):
        bo_array = calculate_property_from_volume_arrays("BO", volumetric_table["HCPV"], volumetric_table["STOIIP"])
        property_arrays["BO"] = bo_array
    if fluid_zone == FluidZone.GAS and "BG" in properties and set(["HCPV", "GIIP"]).issubset(existing_volume_columns):
        bg_array = calculate_property_from_volume_arrays("BG", volumetric_table["HCPV"], volumetric_table["GIIP"])
        property_arrays["BG"] = bg_array

    if "NTG" in properties and set(["BULK", "NET"]).issubset(existing_volume_columns):
        ntg_array = calculate_property_from_volume_arrays("NTG", volumetric_table["NET"], volumetric_table["BULK"])
        property_arrays["NTG"] = ntg_array
    if "PORO" in properties and set(["BULK", "PORV"]).issubset(existing_volume_columns):
        poro_array = calculate_property_from_volume_arrays("PORO", volumetric_table["PORV"], volumetric_table["BULK"])
        property_arrays["PORO"] = poro_array
    if "PORO_NET" in properties and set(["PORV", "NET"]).issubset(existing_volume_columns):
        poro_net_array = calculate_property_from_volume_arrays(
            "PORO_NET", volumetric_table["PORV"], volumetric_table["NET"]
        )
        property_arrays["PORO_NET"] = poro_net_array
    if "SW" in properties and set(["HCPV", "PORV"]).issubset(existing_volume_columns):
        sw_array = calculate_property_from_volume_arrays("SW", volumetric_table["HCPV"], volumetric_table["PORV"])
        property_arrays["SW"] = sw_array

    return property_arrays
