from primary.services.sumo_access.inplace_volumes_table_types import (
    InplaceVolumes,
    InplaceVolumesIndexWithValues,
    InplaceVolumesTableDefinition,
    InplaceVolumesTableDataPerFluidSelection,
    InplaceVolumesStatisticalTableDataPerFluidSelection,
)

from ._shared_converters import (
    _convert_table_data_per_fluid_selection_to_schema,
    _convert_statistical_table_data_per_fluid_selection_to_schema,
)

from .. import schemas


class ConverterFmuDataIo:
    def convert_schema_to_indices_with_values(
        identifiers_with_values: list[schemas.InplaceVolumesIndexWithValues],
    ) -> list[InplaceVolumesIndexWithValues]:
        converted = []
        for identifier_with_values in identifiers_with_values:
            index = ConverterFmuDataIo._convert_schema_to_index(identifier_with_values.indexColumn.value)
            values = identifier_with_values.values
            converted.append(InplaceVolumesIndexWithValues(index, values))
        return converted

    def convert_schema_to_indices(
        indices: list[str] | None,
    ) -> list[InplaceVolumes.TableIndexColumns] | None:
        """Converts the identifiers from the API format to the sumo service format"""
        if indices is None:
            return None

        return [ConverterFmuDataIo._convert_schema_to_index(index) for index in indices]

    def convert_schema_to_fluids(fluid_zones: list[schemas.InplaceVolumesFluid]) -> list[InplaceVolumes.Fluid]:
        """Converts the fluid zones from the API format to the sumo service format"""
        return [InplaceVolumes.Fluid(fluid_zone.value) for fluid_zone in fluid_zones]

    def _convert_schema_to_index(index_string: str) -> InplaceVolumes.TableIndexColumns:
        """Converts the identifier from the API format to the sumo service format"""
        if index_string not in InplaceVolumes.TableIndexColumns.__members__:
            raise ValueError(
                f"Invalid index string: {index_string}. Must be one of {list(InplaceVolumes.TableIndexColumns.__members__.keys())}"
            )

        return InplaceVolumes.TableIndexColumns(index_string)

    def _convert_fluids_to_schema(fluids: list[InplaceVolumes.Fluid]) -> list[schemas.InplaceVolumesFluid]:
        """Converts the fluid zones from the sumo service to the API format"""
        return [schemas.InplaceVolumesFluid(fluid.value) for fluid in fluids]

    def to_api_volumes_table_definitions(
        table_definitions: list[InplaceVolumesTableDefinition],
    ) -> list[schemas.InplaceVolumesTableDefinition]:
        """Converts the table definitions from the sumo service to the API format"""

        return [
            schemas.InplaceVolumesTableDefinition(
                tableName=table_definition.table_name,
                fluids=ConverterFmuDataIo._convert_fluids_to_schema(table_definition.fluids),
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
        return _convert_table_data_per_fluid_selection_to_schema(table_per_fluid_selection)

    def convert_statistical_table_data_per_fluid_selection_to_schema(
        table_data_per_fluid_selection: InplaceVolumesStatisticalTableDataPerFluidSelection,
    ) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
        return _convert_statistical_table_data_per_fluid_selection_to_schema(table_data_per_fluid_selection)
