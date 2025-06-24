from typing import Iterable

import polars as pl

from primary.services.sumo_access.inplace_volumes_table_types import (
    CalculatedVolume,
    CategorizedResultNames,
    InplaceVolumes,
    InplaceVolumesTableData,
    RepeatedTableColumnData,
    Property,
    TableColumnData,
)

"""
This file contains helper functions for conversion between different data types used in the Inplace Volumes Table Assembler.
"""


def get_valid_result_names_from_list(result_names: list[str]) -> list[str]:
    """
    Get valid result names from list of result names

    Result names = Volumetric Columns + Properties + Calculated Volumes
    """
    valid_result_names = []
    result_enums = [InplaceVolumes.VolumetricColumns, Property, CalculatedVolume]
    for result_name in result_names:
        if any(result_name in enum.__members__ for enum in result_enums):
            valid_result_names.append(result_name)

    return valid_result_names


def get_fluid_from_string(fluid_str: str) -> InplaceVolumes.Fluid | None:
    """
    Function to convert string to InplaceVolumes.Fluid
    """
    # Check if the value is among InplaceVolumes.Fluid options
    if fluid_str in InplaceVolumes.Fluid.__members__:
        return InplaceVolumes.Fluid(fluid_str)

    return None


def get_index_column_from_string(index_str: str) -> InplaceVolumes.TableIndexColumns | None:
    """
    Function to convert string to InplaceVolumes.TableIndexColumns
    """
    if index_str in InplaceVolumes.TableIndexColumns.__members__:
        return InplaceVolumes.TableIndexColumns(index_str)

    return None


def get_calculated_volumes_among_result_names(result_names: Iterable[str]) -> list[str]:
    """
    Function to get calculated volumes among result names
    """
    possible_calculated_volumes = set()
    for calculated_volume in result_names:
        if calculated_volume in CalculatedVolume.__members__:
            possible_calculated_volumes.add(calculated_volume)

    return list(possible_calculated_volumes)


def get_properties_among_result_names(result_names: Iterable[str]) -> list[str]:
    """
    Function to get properties among result names
    """

    properties = set()
    for result_name in result_names:
        if result_name in Property.__members__:
            properties.add(result_name)

    return list(properties)


def get_required_volume_names_from_properties(properties: Iterable[str]) -> list[str]:
    """
    Function to convert properties to list of required volume names
    """

    volume_names = set()
    for property in properties:
        volume_names.update(get_required_volume_names_from_property(property))

    return list(volume_names)


def get_required_volume_names_from_property(property: str) -> list[str]:
    """
    Function to convert property to list of required volume names
    """

    if property == Property.NTG:
        return [InplaceVolumes.VolumetricColumns.BULK.value, InplaceVolumes.VolumetricColumns.NET.value]
    if property == Property.PORO:
        return [InplaceVolumes.VolumetricColumns.BULK.value, InplaceVolumes.VolumetricColumns.PORV.value]
    if property == Property.PORO_NET:
        return [InplaceVolumes.VolumetricColumns.PORV.value, InplaceVolumes.VolumetricColumns.NET.value]
    if property == Property.SW:
        return [InplaceVolumes.VolumetricColumns.HCPV.value, InplaceVolumes.VolumetricColumns.PORV.value]
    if property == Property.BO:
        return [InplaceVolumes.VolumetricColumns.HCPV.value, InplaceVolumes.VolumetricColumns.STOIIP.value]
    if property == Property.BG:
        return [InplaceVolumes.VolumetricColumns.HCPV.value, InplaceVolumes.VolumetricColumns.GIIP.value]
    else:
        raise ValueError(f"Unhandled property: {property}")


def get_available_properties_from_volume_names(volume_names: Iterable[str]) -> list[str]:
    """
    Function to get available properties from volume names
    """

    properties = set()
    if set([InplaceVolumes.VolumetricColumns.BULK, InplaceVolumes.VolumetricColumns.NET]).issubset(volume_names):
        properties.add(Property.NTG.value)
    if set([InplaceVolumes.VolumetricColumns.PORV, InplaceVolumes.VolumetricColumns.BULK]).issubset(volume_names):
        properties.add(Property.PORO.value)
    if set([InplaceVolumes.VolumetricColumns.PORV, InplaceVolumes.VolumetricColumns.NET]).issubset(volume_names):
        properties.add(Property.PORO_NET.value)
    if set([InplaceVolumes.VolumetricColumns.HCPV, InplaceVolumes.VolumetricColumns.PORV]).issubset(volume_names):
        properties.add(Property.SW.value)
    if set([InplaceVolumes.VolumetricColumns.HCPV, InplaceVolumes.VolumetricColumns.STOIIP]).issubset(volume_names):
        properties.add(Property.BO.value)
    if set([InplaceVolumes.VolumetricColumns.HCPV, InplaceVolumes.VolumetricColumns.GIIP]).issubset(volume_names):
        properties.add(Property.BG.value)

    return list(properties)


def get_required_volume_names_from_calculated_volumes(calculated_volumes: Iterable[str]) -> list[str]:
    """
    Function to convert calculated volumes to list of required volume names

    NOTE: This function lists all volume names needed, but fluid is not considered
    """

    volume_names = []
    if CalculatedVolume.STOIIP_TOTAL in calculated_volumes:
        volume_names.extend(
            [InplaceVolumes.VolumetricColumns.STOIIP.value, InplaceVolumes.VolumetricColumns.ASSOCIATEDOIL.value]
        )
    if CalculatedVolume.GIIP_TOTAL in calculated_volumes:
        volume_names.extend(
            [InplaceVolumes.VolumetricColumns.GIIP.value, InplaceVolumes.VolumetricColumns.ASSOCIATEDGAS.value]
        )

    return volume_names


def get_available_calculated_volumes_from_volume_names(volume_names: Iterable[str]) -> list[str]:
    """
    Function to get available calculated volumes from volume names
    """

    calculated_volumes = []

    if set([InplaceVolumes.VolumetricColumns.STOIIP, InplaceVolumes.VolumetricColumns.ASSOCIATEDOIL]).issubset(
        volume_names
    ):
        calculated_volumes.append(CalculatedVolume.STOIIP_TOTAL.value)
    if set([InplaceVolumes.VolumetricColumns.GIIP, InplaceVolumes.VolumetricColumns.ASSOCIATEDGAS]).issubset(
        volume_names
    ):
        calculated_volumes.append(CalculatedVolume.GIIP_TOTAL.value)

    return calculated_volumes


def get_required_volume_names_and_categorized_result_names(
    result_names: Iterable[str],
) -> tuple[set[str], CategorizedResultNames]:
    """
    Function to get all required volume names based on result names, and categorize the result names.

    `returns`: A tuple of two elements:
    - A list of all required volume names: volume columns, and volumes needed to calculate properties and calculated volumes
    - Categorize result name

    Note: result_names = volume columns + properties + calculated volumes
    """
    # Detect properties and find volume names needed to calculate properties
    properties = get_properties_among_result_names(result_names)
    required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

    # Detect calculated volumes among result names and find volume names needed for calculation
    calculated_volume_names = get_calculated_volumes_among_result_names(result_names)
    required_volume_names_for_calculated_volumes = get_required_volume_names_from_calculated_volumes(
        calculated_volume_names
    )

    # Extract volume names among result names (excluding all properties, not just valid properties)
    valid_volume_names = set(InplaceVolumes.value_columns())
    volume_names = list(set(result_names) & valid_volume_names)

    # Find all volume names needed from Sumo
    all_required_volume_names = set(
        volume_names + required_volume_names_for_properties + required_volume_names_for_calculated_volumes
    )

    return all_required_volume_names, CategorizedResultNames(
        volume_names=volume_names, calculated_volume_names=calculated_volume_names, property_names=properties
    )


def create_repeated_table_column_data_from_polars_column(
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


def create_inplace_volumes_table_data_from_fluid_results_df(
    fluid_results_df: pl.DataFrame, fluid_value: str
) -> InplaceVolumesTableData:
    """
    Create Inplace Volumetric Table Data from result DataFrame and fluid value.

    The result DataFrame is expected to be for a specific fluid value, i.e. the "FLUID" column is not present in the DataFrame.
    """
    if fluid_results_df.is_empty():
        return InplaceVolumesTableData(fluid_selection=fluid_value, selector_columns=[], result_columns=[])

    if InplaceVolumes.TableIndexColumns.FLUID.value in fluid_results_df.columns:
        raise ValueError(
            f"Results DataFrame for specified fluid should not contain 'FLUID' column, but found it in the input DataFrame: {fluid_results_df.columns}"
        )

    possible_selector_columns = InplaceVolumes.selector_columns()
    existing_selector_columns = [name for name in fluid_results_df.columns if name in possible_selector_columns]
    selector_column_data_list: list[RepeatedTableColumnData] = []
    for column_name in existing_selector_columns:
        column = fluid_results_df[column_name]
        selector_column_data_list.append(create_repeated_table_column_data_from_polars_column(column_name, column))

    existing_result_column_names = [name for name in fluid_results_df.columns if name not in existing_selector_columns]
    result_column_data_list: list[TableColumnData] = []
    for column_name in existing_result_column_names:
        result_column_data_list.append(
            TableColumnData(column_name=column_name, values=fluid_results_df[column_name].to_list())
        )

    return InplaceVolumesTableData(
        fluid_selection=fluid_value,
        selector_columns=selector_column_data_list,
        result_columns=result_column_data_list,
    )
