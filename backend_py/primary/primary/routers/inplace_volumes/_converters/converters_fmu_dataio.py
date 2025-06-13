from primary.services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
    InplaceVolumesTableDefinition,
    InplaceVolumesTableDataPerFluidSelection,
    InplaceVolumesStatisticalTableDataPerFluidSelection,
)

from ._shared_converters import (
    convert_table_data_per_fluid_selection_to_schema,
    convert_statistical_table_data_per_fluid_selection_to_schema,
)

from .. import schemas


class ConverterFmuDataIo:
    @staticmethod
    def convert_schema_to_indices_with_values(
        identifiers_with_values: list[schemas.InplaceVolumesIndexWithValues],
    ) -> list[InplaceVolumesIndexWithValues]:
        converted = []
        for identifier_with_values in identifiers_with_values:
            index = ConverterFmuDataIo._convert_schema_to_index(identifier_with_values.indexColumn.value)
            values = identifier_with_values.values
            converted.append(InplaceVolumesIndexWithValues(index, values))
        return converted

    @staticmethod
    def convert_schema_to_indices(
        indices: list[str] | None,
    ) -> list[InplaceVolumes.TableIndexColumns] | None:
        """Converts the identifiers from the API format to the sumo service format"""
        if indices is None:
            return None

        return [ConverterFmuDataIo._convert_schema_to_index(index) for index in indices]

    @staticmethod
    def _convert_schema_to_index(index_string: str) -> InplaceVolumes.TableIndexColumns:
        """Converts the identifier from the API format to the sumo service format"""
        if index_string not in InplaceVolumes.TableIndexColumns.__members__:
            raise ValueError(
                f"Invalid index string: {index_string}. Must be one of {list(InplaceVolumes.TableIndexColumns.__members__.keys())}"
            )

        return InplaceVolumes.TableIndexColumns(index_string)

    @staticmethod
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
                        indexColumn=schemas.InplaceVolumesIndex(index_with_values.index.value),
                        values=index_with_values.values,
                    )
                    for index_with_values in table_definition.indices_with_values
                ],
            )
            for table_definition in table_definitions
        ]

    @staticmethod
    def convert_table_data_per_fluid_selection_to_schema(
        table_per_fluid_selection: InplaceVolumesTableDataPerFluidSelection,
    ) -> schemas.InplaceVolumesTableDataPerFluidSelection:
        return convert_table_data_per_fluid_selection_to_schema(table_per_fluid_selection)

    @staticmethod
    def convert_statistical_table_data_per_fluid_selection_to_schema(
        table_data_per_fluid_selection: InplaceVolumesStatisticalTableDataPerFluidSelection,
    ) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
        return convert_statistical_table_data_per_fluid_selection_to_schema(table_data_per_fluid_selection)
