from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricsIdentifierWithValues,
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

from ._shared_converters import (
    convert_table_data_per_fluid_selection_to_schema,
    convert_statistical_table_data_per_fluid_selection_to_schema,
)

from .. import schemas


class ConverterOriginal:
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

            identifier = ConverterOriginal._convert_schema_to_identifier(index_with_values.indexColumn)
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

        return [ConverterOriginal._convert_schema_to_identifier(index) for index in indices]

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
        return convert_table_data_per_fluid_selection_to_schema(table_per_fluid_selection)

    @staticmethod
    def convert_statistical_table_data_per_fluid_selection_to_schema(
        table_data_per_fluid_selection: InplaceStatisticalVolumetricTableDataPerFluidSelection,
    ) -> schemas.InplaceVolumesStatisticalTableDataPerFluidSelection:
        return convert_statistical_table_data_per_fluid_selection_to_schema(table_data_per_fluid_selection)
