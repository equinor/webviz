from typing import Callable, Dict, List

import re

import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_types import FluidZone, Property, RepeatedTableColumnData

"""
This file contains helper functions for conversion between different data types used in the Inplace Volumetrics provider

The table data from Sumo retrieves raw_volumetric_columns with suffixes for fluid zones, e.g. "STOIIP_OIL", "STOIIP_GAS", "STOIIP_WATER"

Conversion is made back and forth:

- Raw volumetric columns converted into volume names, without suffixes and a list of available fluid zones.
Based on list of volume names, the available properties are determined. The list of volume names and properties equals the responses.

- A list of responses is converted back to list of volume names and properties. The needed volume names to calculated a property is found,
and a complete list of volume names can be combined with list of fluid zones to get a list of raw volumetric columns.

NOTE:
 - response (name of columns in Sumo) = volume_names + properties
 - properties -> variables?

Terms:
- Front-end: responses = volume_names + properties (w/o suffixes)
- Back-end: volumetric_column_names = create_list_of_volume_names(responses) + fluid_zones (with suffixes)

"""


def get_properties_in_response_names(response_names: List[str]) -> List[str]:
    """
    Function to get properties from response names
    """

    properties = set()
    for response_name in response_names:
        if response_name in Property.__members__:
            properties.add(response_name)

    return list(properties)


def get_required_volume_names_from_properties(properties: List[str]) -> List[str]:
    """
    Function to convert properties to list of required volume names
    """

    volume_names = set()
    for property in properties:
        volume_names.update(get_required_volume_names_from_property(property))

    return list(volume_names)


def _create_safe_denominator_array(denominator_array: pa.array) -> pa.array:
    """
    Create denominator array for safe division, i.e. replace 0 with np.nan
    """
    zero_mask = pc.equal(denominator_array, 0)
    safe_denominator_array = pc.if_else(zero_mask, pa.scalar(float("nan")), denominator_array)
    return safe_denominator_array


def calculate_property_from_volume_arrays(property: str, nominator: pa.array, denominator: pa.array) -> pa.array:
    """
    Calculate property from two arrays of volumes

    Assume equal length and dimension of arrays

    """
    safe_denominator = _create_safe_denominator_array(denominator)

    if property == Property.NTG.value:
        return pc.divide(nominator, safe_denominator)
    if property == Property.PORO.value:
        return pc.divide(nominator, safe_denominator)
    if property == Property.PORO_NET.value:
        return pc.divide(nominator, safe_denominator)
    if property == Property.SW.value:
        return pc.subtract(1, pc.divide(nominator, safe_denominator))
    if property == Property.BO.value:
        return pc.divide(nominator, safe_denominator)
    if property == Property.BG.value:
        return pc.divide(nominator, safe_denominator)
    raise ValueError(f"Unhandled property: {property}")


def get_required_volume_names_from_property(property: str) -> List[str]:
    """
    Function to convert property to list of required volume names
    """

    if property == "NTG":
        return ["BULK", "NET"]
    if property == "PORO":
        return ["BULK", "PORV"]
    if property == "PORO_NET":
        return ["PORV", "NET"]
    if property == "SW":
        return ["HCPV", "PORV"]
    if property == "BO":
        return ["HCPV", "STOIIP"]
    if property == "BG":
        return ["HCPV", "GIIP"]
    else:
        raise ValueError(f"Unhandled property: {property}")


def get_available_properties_from_volume_names(volume_names: set[str]) -> List[str]:
    """
    Function to get available properties from volume names
    """

    properties = set()
    if set(["BULK", "NET"]).issubset(volume_names):
        properties.add(Property.NTG.value)
    if set(["PORV", "BULK"]).issubset(volume_names):
        properties.add(Property.PORO.value)
    if set(["PORV", "NET"]).issubset(volume_names):
        properties.add(Property.PORO_NET.value)
    if set(["HCPV", "PORV"]).issubset(volume_names):
        properties.add(Property.SW.value)
    if set(["HCPV", "STOIIP"]).issubset(volume_names):
        properties.add(Property.BO.value)
    if set(["HCPV", "GIIP"]).issubset(volume_names):
        properties.add(Property.BG.value)

    return list(properties)


def get_volume_names_from_raw_volumetric_column_names(raw_volumetric_column_names: set[str]) -> List[str]:
    """
    Function to get volume names from volumetric column names

    Raw volumetric columns have suffixes for fluid zones, e.g. "STOIIP_OIL", "STOIIP_GAS", "STOIIP_WATER"
    """

    volume_names = set()

    # Clean volume names for suffixes
    for column_name in raw_volumetric_column_names:
        cleaned_name = re.sub(r"_(OIL|GAS|WATER)", "", column_name)
        volume_names.add(cleaned_name)

    # Add total HC responses
    if set(["STOIIP", "ASSOCIATEDOIL"]).issubset(volume_names):
        volume_names.add("STOIIP_TOTAL")
    if set(["GIIP", "ASSOCIATEDGAS"]).issubset(volume_names):
        volume_names.add("GIIP_TOTAL")

    return list(volume_names)


def get_fluid_zones(raw_volumetric_column_names: set[str]) -> List[FluidZone]:
    """
    Function to get fluid zones from raw volumetric column names
    """
    full_set = {FluidZone.OIL, FluidZone.GAS, FluidZone.WATER}
    fluid_zones: set[FluidZone] = set()
    for column_name in raw_volumetric_column_names:
        if "_OIL" in column_name:
            fluid_zones.add(FluidZone.OIL)
        elif "_GAS" in column_name:
            fluid_zones.add(FluidZone.GAS)
        elif "_WATER" in column_name:
            fluid_zones.add(FluidZone.WATER)

        if fluid_zones == full_set:
            break

    return list(fluid_zones)


def create_raw_volumetric_columns_from_volume_names_and_fluid_zones(
    volume_names: set[str], fluid_zones: List[FluidZone]
) -> list[str]:
    """
    Function to create raw volumetric columns from volume names and fluid zones
    """

    volumetric_columns = []

    for volume_name in volume_names:
        columns = create_raw_volumetric_columns_from_volume_name_and_fluid_zones(volume_name, fluid_zones)
        volumetric_columns.extend(columns)

    return volumetric_columns


def create_raw_volumetric_columns_from_volume_name_and_fluid_zones(
    volume_name: str, fluid_zones: List[FluidZone]
) -> list[str]:
    """
    Function to create raw volumetric columns from volume name and fluid zones
    """

    volumetric_columns = []

    for fluid_zone in fluid_zones:
        volumetric_columns.append(f"{volume_name}_{fluid_zone.value.upper()}")

    return volumetric_columns


def create_repeated_table_column_data_from_column(column_name: str, column_values: pa.array) -> RepeatedTableColumnData:
    """
    Create repeated table column data from column name and values array
    """
    unique_values: List[str | int] = list(pa.compute.unique(column_values).to_pylist())
    value_to_index_map = {value: index for index, value in enumerate(unique_values)}
    indices: List[int] = [value_to_index_map[value] for value in column_values.to_pylist()]

    return RepeatedTableColumnData(column_name=column_name, unique_values=unique_values, indices=indices)
