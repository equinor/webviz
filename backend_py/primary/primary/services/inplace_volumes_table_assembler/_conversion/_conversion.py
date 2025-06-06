from typing import Iterable

from primary.services.sumo_access.inplace_volumes_table_types import (
    CalculatedVolume,
    FluidSelection,
    Property,
    InplaceVolumes,
)

"""
This file contains helper functions for conversion between different data types used in the Inplace Volumes Table Assembler.

The table data from Sumo retrieves Inplace Volumes, and the assembler is responsible for calculating properties and volumes based
on the volumetric columns from Sumo.
"""

# TODO: REMOVE? Seems unused
def get_index_from_string(index_str: str) -> InplaceVolumes.TableIndexColumns | None:
    """
    Function to convert string to InplaceVolumes.TableIndexColumns
    """
    if index_str in InplaceVolumes.TableIndexColumns.__members__:
        return InplaceVolumes.TableIndexColumns(index_str)

    return None


def get_fluid_from_string(fluid_str: str) -> InplaceVolumes.Fluid | None:
    """
    Function to convert string to InplaceVolumes.Fluid
    """
    if fluid_str in InplaceVolumes.Fluid.__members__:
        return InplaceVolumes.Fluid(fluid_str)

    return None


def create_fluid_selection_name(fluid_selection: FluidSelection, fluids: list[InplaceVolumes.Fluid]) -> str:
    if fluid_selection != FluidSelection.ACCUMULATED:
        return fluid_selection.value

    return "+".join([fluid.value for fluid in fluids])


def get_index_column_from_string(index_str: str) -> InplaceVolumes.TableIndexColumns | None:
    """
    Function to convert string to InplaceVolumes.TableIndexColumns
    """
    if index_str in InplaceVolumes.TableIndexColumns.__members__:
        return InplaceVolumes.TableIndexColumns(index_str)

    return None


def get_fluid_from_selection(fluid_selection: FluidSelection) -> InplaceVolumes.Fluid | None:
    # Check if the value is among InplaceVolumes.Fluid options
    if fluid_selection in InplaceVolumes.Fluid.__members__.values():
        return InplaceVolumes.Fluid(fluid_selection)

    return None


def convert_fluid_to_fluid_selection(fluid: InplaceVolumes.Fluid) -> FluidSelection:
    return FluidSelection(fluid)


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
    if CalculatedVolume.STOIIP_TOTAL in calculated_volumes:
        volume_names.update(
            [InplaceVolumes.VolumetricColumns.STOIIP.value, InplaceVolumes.VolumetricColumns.ASSOCIATEDOIL.value]
        )
    if CalculatedVolume.GIIP_TOTAL in calculated_volumes:
        volume_names.update(
            [InplaceVolumes.VolumetricColumns.GIIP.value, InplaceVolumes.VolumetricColumns.ASSOCIATEDGAS.value]
        )

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
