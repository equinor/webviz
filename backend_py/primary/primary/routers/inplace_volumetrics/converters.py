from typing import List

from primary.services.sumo_access.inplace_volumetrics_types import (
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

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

    for table in table_per_fluid_selection.table_data_per_fluid_selection:
        selector_columns = [
            schemas.RepeatedTableColumnData(
                columnName=column.column_name,
                uniqueValues=column.unique_values,
                indices=column.indices,
            )
            for column in table.selector_columns
        ]

        result_columns = [
            schemas.TableColumnData(columnName=column.column_name, columnValues=column.values)
            for column in table.result_columns
        ]

        tables.append(
            schemas.InplaceVolumetricTableData(
                fluidSelectionName=table.fluid_selection_name,
                selectorColumns=selector_columns,
                resultColumns=result_columns,
            )
        )

    return schemas.InplaceVolumetricTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def convert_statistical_table_data_per_fluid_selection_to_schema(
    table_data_per_fluid_selection: InplaceStatisticalVolumetricTableDataPerFluidSelection,
) -> schemas.InplaceStatisticalVolumetricTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: List[schemas.InplaceVolumetricTableData] = []

    for table in table_data_per_fluid_selection.table_data_per_fluid_selection:
        selector_columns = [
            schemas.RepeatedTableColumnData(
                columnName=column.column_name,
                uniqueValues=column.unique_values,
                indices=column.indices,
            )
            for column in table.selector_columns
        ]

        result_columns_statistics = [
            schemas.TableColumnStatisticalData(columnName=column.column_name, statisticValues=column.statistic_values)
            for column in table.result_column_statistics
        ]

        tables.append(
            schemas.InplaceStatisticalVolumetricTableData(
                fluidSelectionName=table.fluid_selection_name,
                selectorColumns=selector_columns,
                resultColumnStatistics=result_columns_statistics,
            )
        )

    return schemas.InplaceStatisticalVolumetricTableDataPerFluidSelection(tableDataPerFluidSelection=tables)
