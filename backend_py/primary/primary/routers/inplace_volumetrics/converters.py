from typing import List

from primary.services.sumo_access.inplace_volumetrics_types import InplaceVolumetricsTableDefinition

from . import schemas


def to_api_table_definitions(
    table_definitions: List[InplaceVolumetricsTableDefinition],
) -> List[schemas.InplaceVolumetricsTableDefinition]:
    """Converts the table definitions from the sumo service to the API format"""
    return [
        schemas.InplaceVolumetricsTableDefinition(
            tableName=table_definition.table_name,
            fluidZones=table_definition.fluid_zones,
            resultNames=table_definition.result_names,
            identifiersWithValues=[
                schemas.InplaceVolumetricsIdentifierWithValues(
                    identifier=identifier_with_values.identifier,
                    values=identifier_with_values.values,
                )
                for identifier_with_values in table_definition.identifiers_with_values
            ],
        )
        for table_definition in table_definitions
    ]
