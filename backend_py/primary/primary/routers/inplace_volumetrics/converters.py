from typing import List

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsIndex
from primary.services.sumo_access.inplace_volumetrics_types import InplaceVolumetricTableDataPerFluidSelection
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


def convert_table_data_per_fluid_selection_to_schema(
    table_per_fluid_selection: InplaceVolumetricTableDataPerFluidSelection,
) -> schemas.InplaceVolumetricTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: List[schemas.InplaceVolumetricTableData] = []

    for table in table_per_fluid_selection.table_per_fluid_selection:
        selector_columns = [
            schemas.RepeatedTableColumnData(
                column_name=column.column_name,
                unique_values=column.unique_values,
                indices=column.indices,
            )
            for column in table.selector_columns
        ]

        response_columns = [
            schemas.TableColumnData(column_name=column.column_name, column_values=column.values)
            for column in table.response_columns
        ]

        tables.append(
            schemas.InplaceVolumetricTableData(
                fluid_selection_name=table.fluid_selection_name,
                selector_columns=selector_columns,
                response_columns=response_columns,
            )
        )

    return schemas.InplaceVolumetricTableDataPerFluidSelection(table_per_fluid_selection=tables)
