from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    Statistic,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricsIdentifierWithValues,
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

from . import schemas


def convert_schema_to_identifiers_with_values(
    identifiers_with_values: list[schemas.InplaceVolumetricsIdentifierWithValues],
) -> list[InplaceVolumetricsIdentifierWithValues]:
    converted = []
    for identifier_with_values in identifiers_with_values:
        identifier = _convert_schema_to_identifier(identifier_with_values.identifier)
        values = identifier_with_values.values
        converted.append(InplaceVolumetricsIdentifierWithValues(identifier, values))
    return converted


def convert_schema_to_fluid_zones(fluid_zones: list[schemas.FluidZone]) -> list[FluidZone]:
    """Converts the fluid zones from the API format to the sumo service format"""
    return [FluidZone(fluid_zone.value) for fluid_zone in fluid_zones]


def convert_schema_to_identifiers(
    identifiers: list[schemas.InplaceVolumetricsIdentifier] | None,
) -> list[InplaceVolumetricsIdentifier] | None:
    """Converts the identifiers from the API format to the sumo service format"""
    if identifiers is None:
        return None

    return [_convert_schema_to_identifier(identifier) for identifier in identifiers]


def _convert_schema_to_identifier(identifier: schemas.InplaceVolumetricsIdentifier) -> InplaceVolumetricsIdentifier:
    """Converts the identifier from the API format to the sumo service format"""
    return InplaceVolumetricsIdentifier(identifier.value)


def _convert_fluid_zones_to_schema(fluid_zones: list[FluidZone]) -> list[schemas.FluidZone]:
    """Converts the fluid zones from the sumo service to the API format"""
    return [schemas.FluidZone(fluid_zone.value) for fluid_zone in fluid_zones]


def _convert_result_names_to_schema(result_names: list[str]) -> list[schemas.InplaceVolumetricResultName]:
    """Converts the result names from the sumo service to the API format"""
    return [schemas.InplaceVolumetricResultName(result_name) for result_name in result_names]


def _convert_identifier_string_to_schema(identifier_string: str) -> schemas.InplaceVolumetricsIdentifier:
    """Converts the identifier string from the sumo service to the API format"""
    return schemas.InplaceVolumetricsIdentifier(identifier_string)


def to_api_table_definitions(
    table_definitions: list[InplaceVolumetricsTableDefinition],
) -> list[schemas.InplaceVolumetricsTableDefinition]:
    """Converts the table definitions from the sumo service to the API format"""
    return [
        schemas.InplaceVolumetricsTableDefinition(
            tableName=table_definition.table_name,
            fluidZones=_convert_fluid_zones_to_schema(table_definition.fluid_zones),
            resultNames=_convert_result_names_to_schema(table_definition.result_names),
            identifiersWithValues=[
                schemas.InplaceVolumetricsIdentifierWithValues(
                    identifier=_convert_identifier_string_to_schema(identifier_with_values.identifier),
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

    tables: list[schemas.InplaceVolumetricTableData] = []

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

    tables: list[schemas.InplaceStatisticalVolumetricTableData] = []

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
            schemas.InplaceStatisticalVolumetricTableData(
                fluidSelectionName=table.fluid_selection_name,
                selectorColumns=selector_columns,
                resultColumnStatistics=result_columns_statistics,
            )
        )

    return schemas.InplaceStatisticalVolumetricTableDataPerFluidSelection(tableDataPerFluidSelection=tables)


def _convert_statistic_values_dict_to_schema(
    statistic_values: dict[Statistic, list[float]],
) -> dict[schemas.InplaceVolumetricStatistic, list[float]]:
    """Converts the statistic values dictionary from the service layer format to API format"""
    return {
        _convert_statistic_enum_to_inplace_volumetric_statistic_enum(statistic): values
        for statistic, values in statistic_values.items()
    }


def _convert_statistic_enum_to_inplace_volumetric_statistic_enum(
    statistic: Statistic,
) -> schemas.InplaceVolumetricStatistic:
    """Converts the statistic enum from the service layer format to API enum"""
    if statistic == Statistic.MEAN:
        return schemas.InplaceVolumetricStatistic.MEAN
    if statistic == Statistic.STD_DEV:
        return schemas.InplaceVolumetricStatistic.STD_DEV
    if statistic == Statistic.MIN:
        return schemas.InplaceVolumetricStatistic.MIN
    if statistic == Statistic.MAX:
        return schemas.InplaceVolumetricStatistic.MAX
    if statistic == Statistic.P10:
        return schemas.InplaceVolumetricStatistic.P10
    if statistic == Statistic.P90:
        return schemas.InplaceVolumetricStatistic.P90

    raise ValueError(f"Unknown statistic value: {statistic.value}")
