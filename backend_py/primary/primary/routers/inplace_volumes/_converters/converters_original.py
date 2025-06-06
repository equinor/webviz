from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricsIdentifierWithValues,
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

from ._shared_converters import (
    _convert_table_data_per_fluid_selection_to_schema,
    _convert_statistical_table_data_per_fluid_selection_to_schema,
)

from .. import schemas


class ConverterOriginal:
    def convert_schema_to_identifiers_with_values(
        identifiers_with_values: list[schemas.InplaceVolumesIndexWithValues],
    ) -> list[InplaceVolumetricsIdentifierWithValues]:
        converted = []
        for identifier_with_values in identifiers_with_values:
            identifier = ConverterOriginal._convert_schema_to_identifier(identifier_with_values.indexColumn.value)
            values = identifier_with_values.values
            converted.append(InplaceVolumetricsIdentifierWithValues(identifier, values))
        return converted

    def convert_schema_to_fluid_zones(fluids: list[schemas.InplaceVolumesFluid]) -> list[FluidZone]:
        """Converts the fluids from the API format to the sumo service format"""
        return [FluidZone(fluid_zone.value) for fluid_zone in fluids]

    def convert_schema_to_identifiers(
        indices: list[str] | None,
    ) -> list[InplaceVolumetricsIdentifier] | None:
        """Converts the indices from the API format to the sumo service format"""
        if indices is None:
            return None

        return [ConverterOriginal._convert_schema_to_identifier(index) for index in indices]

    def _convert_schema_to_identifier(index_string: str) -> InplaceVolumetricsIdentifier:
        """Converts the index from the API format to the sumo service format"""
        if index_string not in InplaceVolumetricsIdentifier.__members__:
            raise ValueError(
                f"Invalid index string: {index_string}. Must be one of {list(InplaceVolumetricsIdentifier.__members__.keys())}"
            )

        return InplaceVolumetricsIdentifier(index_string)

    def _convert_fluid_zones_to_schema(fluid_zones: list[FluidZone]) -> list[schemas.InplaceVolumesFluid]:
        """Converts the fluid zones from the sumo service to the API format"""
        return [schemas.InplaceVolumesFluid(fluid_zone.value.lower()) for fluid_zone in fluid_zones]

    def to_api_table_definitions(
        table_definitions: list[InplaceVolumetricsTableDefinition],
    ) -> list[schemas.InplaceVolumesTableDefinition]:
        """Converts the table definitions from the sumo service to the API format"""
        return [
            schemas.InplaceVolumesTableDefinition(
                tableName=table_definition.table_name,
                fluids=ConverterOriginal._convert_fluid_zones_to_schema(table_definition.fluid_zones),
                resultNames=table_definition.result_names,
                indicesWithValues=[
                    schemas.InplaceVolumesIndexWithValues(
                        indexColumn=schemas.InplaceVolumesIndex(identifier_with_values.identifier.value),
                        values=identifier_with_values.values,
                    )
                    for identifier_with_values in table_definition.identifiers_with_values
                ],
            )
            for table_definition in table_definitions
        ]

    def convert_table_data_per_fluid_selection_to_schema(
        table_per_fluid_selection: InplaceVolumetricTableDataPerFluidSelection,
    ) -> schemas.InplaceVolumesTableDataPerFluidSelection:
        return _convert_table_data_per_fluid_selection_to_schema(table_per_fluid_selection)

    def convert_statistical_table_data_per_fluid_selection_to_schema(
        table_data_per_fluid_selection: InplaceStatisticalVolumetricTableDataPerFluidSelection,
    ) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
        return _convert_statistical_table_data_per_fluid_selection_to_schema(table_data_per_fluid_selection)
