from primary.services.sumo_access.deprecated_inplace_volumetrics_types import (
    FluidZone,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricsIdentifierWithValues,
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
    Statistic,
)


from .. import schemas


class DeprecatedInplaceVolumetricsConverters:
    """
    This class provides methods to convert between the API format and the sumo service format for the deprecated inplace volumetrics data.
    """

    @staticmethod
    def convert_schema_to_identifiers_with_values(
        indices_with_values: list[schemas.InplaceVolumesIndexWithValues],
    ) -> list[InplaceVolumetricsIdentifierWithValues]:
        """
        Converts the indices with values from the API format to the sumo service format
        This function filters out the identifiers with values that have the index column as FLUID is not an identifier column in
        the original format.
        """
        converted = []
        for index_with_values in indices_with_values:
            if index_with_values.indexColumn.upper() == "FLUID":
                continue

            identifier = DeprecatedInplaceVolumetricsConverters._convert_schema_to_identifier(
                index_with_values.indexColumn
            )
            values = index_with_values.values
            converted.append(InplaceVolumetricsIdentifierWithValues(identifier, values))
        return converted

    @staticmethod
    def convert_schema_to_fluid_zones(
        indices_with_values: list[schemas.InplaceVolumesIndexWithValues],
    ) -> list[FluidZone]:
        """
        Converts the fluids from the API format to the sumo service format

        Extract fluids from the identifiers with values, which are expected to have the index column as FLUID.
        """
        for index_with_values in indices_with_values:
            if index_with_values.indexColumn.upper() != "FLUID":
                continue

            fluids = [FluidZone(str(fluid)) for fluid in index_with_values.values]

        if not fluids:
            raise ValueError("No fluids found in the identifiers with values")
        return fluids

    @staticmethod
    def convert_schema_to_identifiers(
        indices: list[str] | None,
    ) -> list[InplaceVolumetricsIdentifier] | None:
        """Converts the indices from the API format to the sumo service format"""
        if indices is None:
            return None

        return [DeprecatedInplaceVolumetricsConverters._convert_schema_to_identifier(index) for index in indices]

    @staticmethod
    def _convert_schema_to_identifier(index_string: str) -> InplaceVolumetricsIdentifier:
        """Converts the index from the API format to the sumo service format"""
        if index_string not in InplaceVolumetricsIdentifier.__members__:
            raise ValueError(
                f"Invalid index string: {index_string}. Must be one of {list(InplaceVolumetricsIdentifier.__members__.keys())}"
            )

        return InplaceVolumetricsIdentifier(index_string)

    @staticmethod
    def to_api_table_definitions(
        table_definitions: list[InplaceVolumetricsTableDefinition],
    ) -> list[schemas.InplaceVolumesTableDefinition]:
        """Converts the table definitions from the sumo service to the API format"""
        return [
            schemas.InplaceVolumesTableDefinition(
                tableName=table_definition.table_name,
                resultNames=table_definition.result_names,
                indicesWithValues=[
                    schemas.InplaceVolumesIndexWithValues(
                        indexColumn="FLUID",
                        values=[elm.value for elm in table_definition.fluid_zones],
                    )
                ]
                + [
                    schemas.InplaceVolumesIndexWithValues(
                        indexColumn=identifier_with_values.identifier.value,
                        values=identifier_with_values.values,
                    )
                    for identifier_with_values in table_definition.identifiers_with_values
                ],
            )
            for table_definition in table_definitions
        ]

    @staticmethod
    def convert_table_data_per_fluid_selection_to_schema(
        table_per_fluid_selection: InplaceVolumetricTableDataPerFluidSelection,
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

    @staticmethod
    def convert_statistical_table_data_per_fluid_selection_to_schema(
        table_data_per_fluid_selection: InplaceStatisticalVolumetricTableDataPerFluidSelection,
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
                    statisticValues=DeprecatedInplaceVolumetricsConverters._convert_statistic_values_dict_to_schema(
                        column.statistic_values
                    ),
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

    @staticmethod
    def _convert_statistic_values_dict_to_schema(
        statistic_values: dict[Statistic, list[float]],
    ) -> dict[schemas.InplaceVolumesStatistic, list[float]]:
        """Converts the statistic values dictionary from the service layer format to API format"""
        return {
            DeprecatedInplaceVolumetricsConverters._convert_statistic_enum_to_inplace_volumetric_statistic_enum(
                statistic
            ): values
            for statistic, values in statistic_values.items()
        }

    @staticmethod
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
