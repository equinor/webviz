from typing import Dict, List, Optional, Sequence
import asyncio

import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess
from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
    FluidSelection,
    InplaceVolumetricsIdentifier,
    InplaceVolumetricsIdentifierWithValues,
    InplaceVolumetricsTableDefinition,
    InplaceStatisticalVolumetricTableData,
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableData,
    InplaceVolumetricTableDataPerFluidSelection,
    InplaceStatisticalVolumetricTableDataPerFluidSelection,
)

from ._conversion._conversion import (
    create_raw_volumetric_columns_from_volume_names_and_fluid_zones,
    get_available_properties_from_volume_names,
    get_fluid_zones,
    get_properties_among_result_names,
    get_required_volume_names_from_properties,
    get_volume_names_from_raw_volumetric_column_names,
    convert_fluid_selection_to_fluid_zone,
)

from ._utils import (
    calculate_property_column_arrays,
    create_grouped_statistical_result_table_data_pyarrow,
    create_volumetric_table_per_fluid_zone,
    create_per_realization_accumulated_volume_table,
    create_volumetric_table_accumulated_across_fluid_zones,
    create_inplace_volumetric_table_data_from_result_table,
    get_valid_result_names_from_list,
)

from ..service_exceptions import Service, InvalidParameterError

import logging
from webviz_pkg.core_utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)

# Identifier column values to ignore, i.e. remove from the volumetric tables
IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]


# - InplaceVolumetricsConverter
# - InplaceVolumetricsConstructor
# - InplaceVolumetricsAssembler
class InplaceVolumetricsProvider:
    """
    TODO: Find better name?

    This class provides an interface for interacting with definitions used in front-end for assembling and providing
    metadata and inplace volumetrics table data

    The class interacts with the InplaceVolumetricsAccess class to retrieve data from Sumo and assemble it into a format
    that can be used in the front-end. It also performs validation of the data and aggregation methods where needed.

    The provider contains conversion from result names, properties and fluid zones into volumetric column names that can
    be used to fetch data from Sumo.

    Front-end: results = volume_columns + properties

    Sumo: volumetric_column_names = results + fluid_zones


    """

    def __init__(self, inplace_volumetrics_access: InplaceVolumetricsAccess):
        self._inplace_volumetrics_access = inplace_volumetrics_access

    # TODO: When having metadata, provide all column names, and the get the possible properties from the result names
    # Provide the available properties from metadata, without suffix and provide possible FluidZones
    async def get_volumetric_table_metadata(self) -> List[InplaceVolumetricsTableDefinition]:
        vol_table_names = await self._inplace_volumetrics_access.get_inplace_volumetrics_table_names_async()

        async def get_named_inplace_volumetrics_table_async(table_name: str) -> Dict[str, pa.Table]:
            return {table_name: await self._inplace_volumetrics_access.get_inplace_volumetrics_table_async(table_name)}

        tasks = [
            asyncio.create_task(get_named_inplace_volumetrics_table_async(vol_table_name))
            for vol_table_name in vol_table_names
        ]
        tables = await asyncio.gather(*tasks)
        print(tables, len(tables))

        tables_info: List[InplaceVolumetricsTableDefinition] = []
        for table_result in tables:
            table_name, table = list(table_result.items())[0]

            non_volume_columns = self._inplace_volumetrics_access.get_possible_selector_columns()

            # Get raw volume names
            raw_volumetric_column_names = [name for name in table.column_names if name not in non_volume_columns]

            fluid_zones = get_fluid_zones(raw_volumetric_column_names)
            volume_names = get_volume_names_from_raw_volumetric_column_names(raw_volumetric_column_names)
            available_property_names = get_available_properties_from_volume_names(volume_names)
            result_names = volume_names + available_property_names
            valid_result_names = get_valid_result_names_from_list(result_names)

            identifiers_with_values = []
            for identifier_name in self._inplace_volumetrics_access.get_expected_identifier_columns():
                if identifier_name in table.column_names:
                    identifier_values = table[identifier_name].unique().to_pylist()
                    filtered_identifier_values = [
                        value for value in identifier_values if value not in IGNORED_IDENTIFIER_COLUMN_VALUES
                    ]
                    identifiers_with_values.append(
                        InplaceVolumetricsIdentifierWithValues(
                            identifier=identifier_name, values=filtered_identifier_values
                        )
                    )
            tables_info.append(
                InplaceVolumetricsTableDefinition(
                    table_name=table_name,
                    fluid_zones=fluid_zones,
                    result_names=valid_result_names,
                    identifiers_with_values=identifiers_with_values,
                )
            )
        return tables_info

    @staticmethod
    def _create_result_table(
        volume_table: pa.Table,
        requested_volume_names: List[str],
        requested_properties: List[str],
        fluid_selection: FluidSelection,
    ) -> pa.Table:
        """
        Create a result table from the volume table and requested properties

        If volume names needed for properties are not available in the volume table, the function will skip the property

        The result table contains the requested volume names and calculated properties
        """
        # Convert fluid selection to fluid zone
        fluid_zone = convert_fluid_selection_to_fluid_zone(fluid_selection)

        # Calculate properties
        property_columns = calculate_property_column_arrays(volume_table, requested_properties, fluid_zone=fluid_zone)

        # Find valid selector columns and volume names
        possible_selector_columns = InplaceVolumetricsAccess.get_possible_selector_columns()
        available_selector_columns = [col for col in possible_selector_columns if col in volume_table.column_names]
        available_volume_names = [name for name in requested_volume_names if name in volume_table.column_names]

        # Build result table (requested volumes and calculated properties)
        result_table = volume_table.select(available_selector_columns + available_volume_names)
        for property_name, property_column in property_columns.items():
            result_table = result_table.append_column(property_name, property_column)

        return result_table

    async def get_accumulated_by_selection_per_realization_volumetric_table_data_async(
        self,
        table_name: str,
        result_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues] = [],
        group_by_identifiers: Sequence[InplaceVolumetricsIdentifier] = [InplaceVolumetricsIdentifier.ZONE],
        accumulate_fluid_zones: bool = False,
    ) -> InplaceVolumetricTableDataPerFluidSelection:
        # If one or more identifier_with_values is empty list of selections, no volume data can be shown
        hasEmptyIdentifierSelection = any(
            not identifier_with_values.values for identifier_with_values in identifiers_with_values
        )
        if hasEmptyIdentifierSelection:
            raise InvalidParameterError(
                "Each provided identifier column must have at least one selected value", Service.GENERAL
            )

        # NOTE: "_TOTAL" columns are not handled

        # Detect properties and find volume names needed to calculate properties
        properties = get_properties_among_result_names(result_names)
        required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

        # Extract volume names among result names
        volume_names = list(set(result_names) - set(properties))

        # Find all volume names needed from Sumo
        all_volume_names = set(volume_names + required_volume_names_for_properties)

        # Get volume table per fluid selection - requested volumes and volumes needed for properties
        volume_table_per_fluid_selection: Dict[FluidSelection, pa.Table] = (
            await self._create_volume_table_per_fluid_selection(
                table_name, all_volume_names, fluid_zones, realizations, identifiers_with_values, accumulate_fluid_zones
            )
        )

        # If accumulate_fluid_zones valid_properties exclude BO and BG, otherwise all properties
        valid_properties = properties
        if accumulate_fluid_zones:
            valid_properties = [prop for prop in properties if prop not in ["BO", "BG"]]

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_identifier
        table_data_per_fluid_selection: List[InplaceVolumetricTableData] = []
        for fluid_selection, volume_table in volume_table_per_fluid_selection.items():
            accumulated_volume_table = create_per_realization_accumulated_volume_table(
                volume_table,
                group_by_identifiers,
            )

            # Create result table - requested volumes and calculated properties
            accumulated_result_table = InplaceVolumetricsProvider._create_result_table(
                accumulated_volume_table, volume_names, valid_properties, fluid_selection
            )

            fluid_selection_name = fluid_selection.value
            if fluid_selection == FluidSelection.ACCUMULATED:
                fluid_selection_name = " + ".join([fluid_zone.value for fluid_zone in fluid_zones])

            table_data = create_inplace_volumetric_table_data_from_result_table(
                accumulated_result_table, fluid_selection_name
            )
            table_data_per_fluid_selection.append(table_data)

        return InplaceVolumetricTableDataPerFluidSelection(
            table_data_per_fluid_selection=table_data_per_fluid_selection
        )

    async def get_accumulated_by_selection_statistical_volumetric_table_data_async(
        self,
        table_name: str,
        result_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues] = [],
        group_by_identifiers: Sequence[InplaceVolumetricsIdentifier] = [InplaceVolumetricsIdentifier.ZONE],
        accumulate_fluid_zones: bool = False,
    ) -> InplaceStatisticalVolumetricTableDataPerFluidSelection:
        # If one or more identifier_with_values is empty list of selections, no volume data can be shown
        hasEmptyIdentifierSelection = any(
            not identifier_with_values.values for identifier_with_values in identifiers_with_values
        )
        if hasEmptyIdentifierSelection:
            raise InvalidParameterError(
                "Each provided identifier column must have at least one selected value", Service.GENERAL
            )

        # Detect properties and find volume names needed to calculate properties
        properties = get_properties_among_result_names(result_names)
        required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

        # Extract volume names among result names
        volume_names = list(set(result_names) - set(properties))

        # Find all volume names needed from Sumo
        all_volume_names = set(volume_names + required_volume_names_for_properties)

        volume_table_per_fluid_selection: Dict[FluidSelection, pa.Table] = (
            await self._create_volume_table_per_fluid_selection(
                table_name, all_volume_names, fluid_zones, realizations, identifiers_with_values, accumulate_fluid_zones
            )
        )

        # If accumulate_fluid_zones valid_properties exclude BO and BG, otherwise all properties
        valid_properties = properties
        if accumulate_fluid_zones:
            valid_properties = [prop for prop in properties if prop not in ["BO", "BG"]]

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_identifier
        statistical_table_data_per_fluid_selection: List[InplaceStatisticalVolumetricTableData] = []
        for fluid_selection, volume_table in volume_table_per_fluid_selection.items():
            accumulated_volume_table = create_per_realization_accumulated_volume_table(
                volume_table,
                group_by_identifiers,
            )

            # Create result table - requested volumes and calculated properties
            accumulated_result_table = InplaceVolumetricsProvider._create_result_table(
                accumulated_volume_table, volume_names, valid_properties, fluid_selection
            )

            # Create statistical table data
            selector_column_data_list, result_column_data_list = create_grouped_statistical_result_table_data_pyarrow(
                accumulated_result_table,
                group_by_identifiers,
            )

            fluid_selection_name = fluid_selection.value
            if fluid_selection == FluidSelection.ACCUMULATED:
                fluid_selection_name = " + ".join([fluid_zone.value for fluid_zone in fluid_zones])

            statistical_table_data_per_fluid_selection.append(
                InplaceStatisticalVolumetricTableData(
                    fluid_selection_name=fluid_selection_name,
                    selector_columns=selector_column_data_list,
                    result_column_statistics=result_column_data_list,
                )
            )

        return InplaceStatisticalVolumetricTableDataPerFluidSelection(
            table_data_per_fluid_selection=statistical_table_data_per_fluid_selection
        )

    async def _create_volume_table_per_fluid_selection(
        self,
        table_name: str,
        volume_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues] = [],
        accumulate_fluid_zones: bool = False,
    ) -> Dict[FluidSelection, pa.Table]:
        """
        This function creates a volumetric table per fluid selection

        The requested volume names are the set of result names and necessary result names to calculate properties.
        Calculation of properties are handled outside this function.

        The table is created by filtering the raw volumetric table based on the identifiers and realizations and then
        accumulate the volumes across fluid zones.

        Input:
        - table_name: str - Name of the table in Sumo
        - volume_names: set[str] - All volume names needed from Sumo, including volume names needed for properties
        - fluid_zones: List[FluidZone] - Fluid zones to create volumetric tables for
        - realizations: Sequence[int] - Realizations to include in the volumetric table
        - identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues] - Identifier values to filter the volumetric table, i.e. row filtering
        - accumulate_fluid_zones: bool - Whether to accumulate the volumes across fluid zones
        """

        # Create the raw volumetric columns from all volume names and fluid zones
        raw_volumetric_column_names = create_raw_volumetric_columns_from_volume_names_and_fluid_zones(
            volume_names, fluid_zones
        )

        timer = PerfTimer()
        # Get the raw volumetric table
        row_filtered_raw_volumetrics_table = await self._create_row_filtered_volumetric_table_data_async(
            table_name=table_name,
            volumetric_columns=raw_volumetric_column_names,
            realizations=realizations,
            identifiers_with_values=identifiers_with_values,
        )
        timer_create_raw_table = timer.lap_ms()
        print(f"Time creating raw table: {timer_create_raw_table}ms")

        # Build a new table with one merged column per result and additional fluid zone column is created.
        # I.e. where result column has values per fluid zone appended after each other. Num rows is then original num rows * num fluid zones
        # E.g.:
        #
        # filtered_table.column_names = ["REAL", "ZONE", "REGION", "FACIES", "LICENSE", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]
        # fluid_zones = [FluidZone.OIL, FluidZone.GAS, FluidZone.WATER]
        # ["REAL", "ZONE", "REGION", "FACIES", "LICENSE", "STOIIP", "BO", "HCPV"]
        volume_table_per_fluid_zone: Dict[FluidZone, pa.Table] = create_volumetric_table_per_fluid_zone(
            fluid_zones, row_filtered_raw_volumetrics_table
        )

        possible_selector_columns = self._inplace_volumetrics_access.get_possible_selector_columns()
        valid_selector_columns = [
            col for col in possible_selector_columns if col in row_filtered_raw_volumetrics_table.column_names
        ]

        volume_table_per_fluid_selection: Dict[str, pa.Table] = {}
        if accumulate_fluid_zones and len(fluid_zones) > 1:
            # Build result table - accumulated across fluid zones
            # - Sum each volume column across fluid zones
            volumetric_table_accumulated_across_fluid_zones = create_volumetric_table_accumulated_across_fluid_zones(
                volume_table_per_fluid_zone, valid_selector_columns
            )

            volume_table_per_fluid_selection[FluidSelection.ACCUMULATED] = (
                volumetric_table_accumulated_across_fluid_zones
            )

        else:
            # Build result table - per fluid zone
            # - Requested volumes
            for fluid_zone, volumetric_table in volume_table_per_fluid_zone.items():
                volume_table_per_fluid_selection[fluid_zone] = volumetric_table

        return volume_table_per_fluid_selection

    async def _create_row_filtered_volumetric_table_data_async(
        self,
        table_name: str,
        volumetric_columns: set[str],
        realizations: Sequence[int] = None,
        identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues] = [],
    ) -> pa.Table:
        """
        Create table filtered on identifier values and realizations
        """
        if realizations is not None and len(realizations) == 0:
            return {}

        # Get the inplace volumetrics table from collection in Sumo
        #
        # NOTE:
        # Soft vs hard fail depends on detail level when building the volumetric columns from retrieved result names + fluid zones
        # - Soft fail: get_inplace_volumetrics_table_no_throw_async() does not require matching volumetric column names
        # - Hard fail: get_inplace_volumetrics_table_async() throws an exception if requested column names are not found
        inplace_volumetrics_table: pa.Table = (
            await self._inplace_volumetrics_access.get_inplace_volumetrics_table_no_throw_async(
                table_name=table_name, column_names=volumetric_columns
            )
        )

        timer = PerfTimer()
        table_column_names = inplace_volumetrics_table.column_names

        # Build mask for rows - default all rows
        mask = pa.array([True] * inplace_volumetrics_table.num_rows)

        # Mask/filter out rows with ignored identifier values
        for identifier_name in InplaceVolumetricsIdentifier:
            if identifier_name.value in table_column_names:
                ignored_identifier_values_mask = pc.is_in(
                    inplace_volumetrics_table[identifier_name.value],
                    value_set=pa.array(IGNORED_IDENTIFIER_COLUMN_VALUES),
                )
                mask = pc.and_(mask, pc.invert(ignored_identifier_values_mask))

        # Add mask for realizations
        if realizations is not None:
            # Check if every element in pa.array(realizations) exists in vol_table["REAL"]
            real_values_set = set(inplace_volumetrics_table["REAL"].to_pylist())
            missing_realizations = [real for real in realizations if real not in real_values_set]

            if missing_realizations:
                raise ValueError(
                    f"Missing data error: The following realization values do not exist in 'REAL' column: {missing_realizations}"
                )

            realization_mask = pc.is_in(inplace_volumetrics_table["REAL"], value_set=pa.array(realizations))
            mask = pc.and_(mask, realization_mask)

        # Add mask for each identifier filter
        for identifier_with_values in identifiers_with_values:
            if not identifier_with_values.values:
                mask = pa.array([False] * inplace_volumetrics_table.num_rows)
                break

            identifier_column_name = identifier_with_values.identifier.value
            if identifier_column_name not in table_column_names:
                raise ValueError(f"Identifier column name {identifier_column_name} not found in table {table_name}")

            identifier_mask = pc.is_in(
                inplace_volumetrics_table[identifier_column_name], value_set=pa.array(identifier_with_values.values)
            )
            mask = pc.and_(mask, identifier_mask)

        filtered_table = inplace_volumetrics_table.filter(mask)
        time_row_filtering = timer.lap_ms()
        print(f"Volumetric table row filtering (based on selectors): {time_row_filtering}ms")

        return filtered_table
