from primary.services.utils.authenticated_user import AuthenticatedUser

from primary.services.sumo_access.deprecated_inplace_volumetrics_access import DEPRECATED_InplaceVolumetricsAccess
from primary.services.deprecated_inplace_volumetrics_assembler.deprecated_inplace_volumetrics_assembler import (
    DEPRECATED_InplaceVolumetricsAssembler,
)

from ._converters import DeprecatedInplaceVolumetricsConverters

from .. import schemas


#########################################################################################################################
#
#
# This file contains route handlers for the deprecated format(s) of Inplace Volumes data.
#
#
#########################################################################################################################


async def handle_table_definitions_for_deprecated_format_async(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
) -> list[schemas.InplaceVolumesTableDefinition]:
    """
    Create table definitions from deprecated format for the given case and ensemble.
    """

    access = DEPRECATED_InplaceVolumetricsAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    assembler = DEPRECATED_InplaceVolumetricsAssembler(access)
    tables = await assembler.get_volumetric_table_metadata_async()
    return DeprecatedInplaceVolumetricsConverters.to_api_table_definitions(tables)


async def handle_aggregated_per_realization_table_data_for_deprecated_format_async(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
    table_name: str,
    result_names: list[str],
    indices_with_values: list[schemas.InplaceVolumesIndexWithValues],
    group_by_indices: list[str] | None,
    realizations: list[int] | None = None,
) -> schemas.InplaceVolumesTableDataPerFluidSelection:
    """
    Create aggregated per realization table data from deprecated format for the given case and ensemble.
    """

    access = DEPRECATED_InplaceVolumetricsAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    do_accumulate_fluid_zones = group_by_indices is None or "FLUID" not in group_by_indices
    adjusted_group_by_indices = [elm for elm in group_by_indices if elm != "FLUID"] if group_by_indices else None
    if not adjusted_group_by_indices:
        adjusted_group_by_indices = None

    assembler = DEPRECATED_InplaceVolumetricsAssembler(access)
    data = await assembler.create_accumulated_by_selection_per_realization_volumetric_table_data_async(
        table_name=table_name,
        result_names=set(result_names),
        fluid_zones=DeprecatedInplaceVolumetricsConverters.convert_schema_to_fluid_zones(indices_with_values),
        identifiers_with_values=DeprecatedInplaceVolumetricsConverters.convert_schema_to_identifiers_with_values(
            indices_with_values
        ),
        group_by_identifiers=DeprecatedInplaceVolumetricsConverters.convert_schema_to_identifiers(
            adjusted_group_by_indices
        ),
        realizations=realizations,
        accumulate_fluid_zones=do_accumulate_fluid_zones,
    )

    return DeprecatedInplaceVolumetricsConverters.convert_table_data_per_fluid_selection_to_schema(data)


async def handle_aggregated_statistical_table_data_for_deprecated_format_async(
    authenticated_user: AuthenticatedUser,
    case_uuid: str,
    ensemble_name: str,
    table_name: str,
    result_names: list[str],
    indices_with_values: list[schemas.InplaceVolumesIndexWithValues],
    group_by_indices: list[str] | None,
    realizations: list[int] | None = None,
) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
    """
    Create aggregated statistical table data from deprecated format for the given case and ensemble.
    """

    access = DEPRECATED_InplaceVolumetricsAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    do_accumulate_fluid_zones = group_by_indices is None or "FLUID" not in group_by_indices
    adjusted_group_by_indices = [elm for elm in group_by_indices if elm != "FLUID"] if group_by_indices else None
    if not adjusted_group_by_indices:
        adjusted_group_by_indices = None

    assembler = DEPRECATED_InplaceVolumetricsAssembler(access)
    data = await assembler.create_accumulated_by_selection_statistical_volumetric_table_data_async(
        table_name=table_name,
        result_names=set(result_names),
        fluid_zones=DeprecatedInplaceVolumetricsConverters.convert_schema_to_fluid_zones(indices_with_values),
        identifiers_with_values=DeprecatedInplaceVolumetricsConverters.convert_schema_to_identifiers_with_values(
            indices_with_values
        ),
        group_by_identifiers=DeprecatedInplaceVolumetricsConverters.convert_schema_to_identifiers(
            adjusted_group_by_indices
        ),
        realizations=realizations,
        accumulate_fluid_zones=do_accumulate_fluid_zones,
    )

    return DeprecatedInplaceVolumetricsConverters.convert_statistical_table_data_per_fluid_selection_to_schema(data)
