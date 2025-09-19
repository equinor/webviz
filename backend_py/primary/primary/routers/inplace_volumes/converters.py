from primary.services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
    InplaceVolumesTableDefinition,
    InplaceVolumesTableDataPerFluidSelection,
    InplaceVolumesStatisticalTableDataPerFluidSelection,
    Statistic,
)

from . import schemas


#########################################################################################################################
#
#
# This file provides methods to convert between the API format and the sumo service format for inplace volumes data.
#
#
#########################################################################################################################


def convert_schema_to_indices_with_values(
    identifiers_with_values: list[schemas.InplaceVolumesIndexWithValues],
) -> list[InplaceVolumesIndexWithValues]:
    converted = []
    for identifier_with_values in identifiers_with_values:
        index = _convert_schema_to_index(identifier_with_values.indexColumn)
        values = identifier_with_values.values
        converted.append(InplaceVolumesIndexWithValues(index, values))
    return converted


def convert_schema_to_indices(
    indices: list[str] | None,
) -> list[InplaceVolumes.TableIndexColumns] | None:
    """Converts the identifiers from the API format to the sumo service format"""
    if indices is None:
        return None

    return [_convert_schema_to_index(index) for index in indices]


def _convert_schema_to_index(index_string: str) -> InplaceVolumes.TableIndexColumns:
    """Converts the identifier from the API format to the sumo service format"""
    if index_string not in InplaceVolumes.TableIndexColumns.__members__:
        raise ValueError(
            f"Invalid index string: {index_string}. Must be one of {list(InplaceVolumes.TableIndexColumns.__members__.keys())}"
        )

    return InplaceVolumes.TableIndexColumns(index_string)


def to_api_volumes_table_definitions(
    table_definitions: list[InplaceVolumesTableDefinition],
) -> list[schemas.InplaceVolumesTableDefinition]:
    """Converts the table definitions from the sumo service to the API format"""

    return [
        schemas.InplaceVolumesTableDefinition(
            tableName=table_definition.table_name,
            resultNames=table_definition.result_names,
            indicesWithValues=[
                schemas.InplaceVolumesIndexWithValues(
                    indexColumn=index_with_values.index.value,
                    values=index_with_values.values,
                )
                for index_with_values in table_definition.indices_with_values
            ],
        )
        for table_definition in table_definitions
    ]


def convert_table_data_per_fluid_selection_to_schema(
    table_per_fluid_selection: InplaceVolumesTableDataPerFluidSelection,
) -> schemas.InplaceVolumesTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: list[schemas.InplaceVolumesTableData] = []

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
            schemas.InplaceVolumesTableData(
                fluidSelection=table.fluid_selection,
                selectorColumns=selector_columns,
                resultColumns=result_columns,
            )
        )

    return schemas.InplaceVolumesTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def convert_statistical_table_data_per_fluid_selection_to_schema(
    table_data_per_fluid_selection: InplaceVolumesStatisticalTableDataPerFluidSelection,
) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
    """Converts the table data from the sumo service to the schema format"""

    tables: list[schemas.InplaceVolumesStatisticalTableData] = []

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
            schemas.TableColumnStatisticalData(
                columnName=column.column_name,
                statisticValues=_convert_statistic_values_dict_to_schema(column.statistic_values),
            )
            for column in table.result_column_statistics
        ]

        tables.append(
            schemas.InplaceVolumesStatisticalTableData(
                fluidSelection=table.fluid_selection,
                selectorColumns=selector_columns,
                resultColumnStatistics=result_columns_statistics,
            )
        )

    return schemas.InplaceVolumesStatisticalTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def _convert_statistic_values_dict_to_schema(
    statistic_values: dict[Statistic, list[float]],
) -> dict[schemas.InplaceVolumesStatistic, list[float]]:
    """Converts the statistic values dictionary from the service layer format to API format"""
    return {
        _convert_statistic_enum_to_inplace_volumetric_statistic_enum(statistic): values
        for statistic, values in statistic_values.items()
    }


def _convert_statistic_enum_to_inplace_volumetric_statistic_enum(
    statistic: Statistic,
) -> schemas.InplaceVolumesStatistic:
    """Converts the statistic enum from the service layer format to API enum"""
    if statistic == Statistic.MEAN:
        return schemas.InplaceVolumesStatistic.MEAN
    if statistic == Statistic.STD_DEV:
        return schemas.InplaceVolumesStatistic.STD_DEV
    if statistic == Statistic.MIN:
        return schemas.InplaceVolumesStatistic.MIN
    if statistic == Statistic.MAX:
        return schemas.InplaceVolumesStatistic.MAX
    if statistic == Statistic.P10:
        return schemas.InplaceVolumesStatistic.P10
    if statistic == Statistic.P90:
        return schemas.InplaceVolumesStatistic.P90

    raise ValueError(f"Unhandled statistic value: {statistic.value}")
