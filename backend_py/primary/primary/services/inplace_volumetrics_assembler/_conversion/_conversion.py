from typing import Iterable

import re

from primary.services.sumo_access.inplace_volumetrics_types import (
    CalculatedVolume,
    FluidZone,
    FluidSelection,
    Property,
    InplaceVolumetricsIdentifier,
)
from primary.services.sumo_access.inplace_volumetrics_access import ALLOWED_RAW_VOLUMETRIC_COLUMNS

"""
This file contains helper functions for conversion between different data types used in the Inplace Volumetrics provider

The table data from Sumo retrieves raw_volumetric_columns with suffixes for fluid zones, e.g. "STOIIP_OIL", "STOIIP_GAS", "STOIIP_WATER"

Conversion is made back and forth:

- Raw volumetric columns converted into volume names, without suffixes and a list of available fluid zones.
Based on list of volume names, the available properties are determined. The list of volume names and properties equals the results.

- A list of results is converted back to list of volume names and properties. The needed volume names to calculated a property is found,
and a complete list of volume names can be combined with list of fluid zones to get a list of raw volumetric columns.


Terms:
- Front-end: `results` = volume_names + properties (w/o suffixes)
- Back-end:
    - all_volume_names = volume_names + get_required_volume_names_from_properties(properties)
    - `raw_volumetric_column_names` = create_list_of_raw_volumetric_column_names(all_volume_names, fluid_zones)

"""


def get_identifier_from_string(identifier_str: str) -> InplaceVolumetricsIdentifier | None:
    """
    Function to convert string to InplaceVolumetricsIdentifier
    """
    if identifier_str in InplaceVolumetricsIdentifier.__members__:
        return InplaceVolumetricsIdentifier(identifier_str)

    return None


def create_fluid_selection_name(fluid_selection: FluidSelection, fluid_zones: list[FluidZone]) -> str:
    if fluid_selection != FluidSelection.ACCUMULATED:
        return fluid_selection.value

    return "+".join([fluid_zone.value for fluid_zone in fluid_zones])


def get_fluid_zone_from_selection(fluid_selection: FluidSelection) -> FluidZone | None:
    # Check if the value is among FluidZone options
    if fluid_selection in FluidZone.__members__.values():
        return FluidZone(fluid_selection)
    else:
        return None


def convert_fluid_zone_to_fluid_selection(fluid_zone: FluidZone) -> FluidSelection:
    return FluidSelection(fluid_zone)


def get_calculated_volumes_among_result_names(result_names: Iterable[str]) -> list[str]:
    """
    Function to get calculated volumes among result names
    """
    possible_calculated_volumes = set()
    for calculated_volume in result_names:
        if calculated_volume in CalculatedVolume.__members__:
            possible_calculated_volumes.add(calculated_volume)

    return list(possible_calculated_volumes)


def get_required_volume_names_from_calculated_volumes(calculated_volumes: Iterable[str]) -> list[str]:
    """
    Function to convert calculated volumes to list of required volume names

    NOTE: This function lists all volume names needed, but fluid zone is not considered
    """
    volume_names = set()
    if "STOIIP_TOTAL" in calculated_volumes:
        volume_names.update(["STOIIP", "ASSOCIATEDOIL"])
    if "GIIP_TOTAL" in calculated_volumes:
        volume_names.update(["GIIP", "ASSOCIATEDGAS"])

    return list(volume_names)


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


def get_available_properties_from_volume_names(volume_names: Iterable[str]) -> list[str]:
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


def get_volume_names_from_raw_volumetric_column_names(raw_volumetric_column_names: Iterable[str]) -> list[str]:
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


def get_fluid_zones(raw_volumetric_column_names: Iterable[str]) -> list[FluidZone]:
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
    volume_names: set[str], fluid_zones: list[FluidZone]
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
    volume_name: str, fluid_zones: list[FluidZone]
) -> list[str]:
    """
    Function to create raw volumetric columns from volume name and fluid zones
    """

    volumetric_columns = []

    for fluid_zone in fluid_zones:
        candidate_column = f"{volume_name}_{fluid_zone.value.upper()}"
        if candidate_column in ALLOWED_RAW_VOLUMETRIC_COLUMNS:
            volumetric_columns.append(candidate_column)

    return volumetric_columns
