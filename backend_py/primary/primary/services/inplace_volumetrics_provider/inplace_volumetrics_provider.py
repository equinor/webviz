from typing import Dict, List, Optional, Sequence
import asyncio

import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_acces_NEW import InplaceVolumetricsAccess
from primary.services.sumo_access.inplace_volumetrics_types import (
    FluidZone,
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
    calculate_property_from_volume_arrays,
    create_raw_volumetric_columns_from_volume_names_and_fluid_zones,
    get_available_properties_from_volume_names,
    get_fluid_zones,
    get_properties_among_result_names,
    get_required_volume_names_from_properties,
    get_volume_names_from_raw_volumetric_column_names,
)

from ._utils import (
    create_statistical_grouped_result_table_data_pandas,
    create_statistical_grouped_result_table_data_pyarrow,
    create_per_realization_accumulated_result_table,
    create_volumetric_table_accumulated_across_fluid_zones,
    create_inplace_volumetric_table_data_from_result_table,
    get_valid_result_names_from_list,
)

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
        # Get result table per fluid selection
        result_table_per_fluid_selection: Dict[str, pa.Table] = await self._create_result_table_per_fluid_selection(
            table_name, result_names, fluid_zones, realizations, identifiers_with_values, accumulate_fluid_zones
        )

        possible_selector_columns = self._inplace_volumetrics_access.get_possible_selector_columns()

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_identifier
        aggregated_result_table_per_fluid_selection: Dict[str, pa.Table] = {}
        for fluid_selection_name, result_table in result_table_per_fluid_selection.items():
            valid_selector_columns = [col for col in possible_selector_columns if col in result_table.column_names]
            accumulated_result_table = create_per_realization_accumulated_result_table(
                result_table,
                valid_selector_columns,
                group_by_identifiers,
            )
            aggregated_result_table_per_fluid_selection[fluid_selection_name] = accumulated_result_table

        # Convert tables into InplaceVolumetricTableDataPerFluidSelection
        table_data_per_fluid_selection: List[InplaceVolumetricTableData] = []
        for fluid_selection_name, result_table in aggregated_result_table_per_fluid_selection.items():
            valid_selector_columns = [col for col in possible_selector_columns if col in result_table.column_names]
            table_data = create_inplace_volumetric_table_data_from_result_table(
                result_table, fluid_selection_name, valid_selector_columns
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
        timer = PerfTimer()
        result_table_per_fluid_selection: Dict[str, pa.Table] = await self._create_result_table_per_fluid_selection(
            table_name, result_names, fluid_zones, realizations, identifiers_with_values, accumulate_fluid_zones
        )
        timer_create_table_per_fluid_selection = timer.lap_ms()

        possible_selector_columns = self._inplace_volumetrics_access.get_possible_selector_columns()

        # Perform aggregation per result table
        # - Aggregate by each requested group_by_identifier
        timer_pyarrow = 0
        timer_pandas = 0
        statistical_table_data_per_fluid_selection: List[InplaceStatisticalVolumetricTableData] = []
        for fluid_selection_name, result_table in result_table_per_fluid_selection.items():
            valid_selector_columns = [col for col in possible_selector_columns if col in result_table.column_names]

            timer.lap_ms()
            selector_column_data_list, result_column_data_list = create_statistical_grouped_result_table_data_pyarrow(
                result_table,
                valid_selector_columns,
                group_by_identifiers,
            )
            timer_pyarrow += timer.lap_ms()

            # __dummy_call = create_statistical_grouped_result_table_data_pandas(
            #     result_table,
            #     valid_selector_columns,
            #     group_by_identifiers,
            # )
            timer_pandas += timer.lap_ms()

            statistical_table_data_per_fluid_selection.append(
                InplaceStatisticalVolumetricTableData(
                    fluid_selection_name=fluid_selection_name,
                    selector_columns=selector_column_data_list,
                    result_column_statistics=result_column_data_list,
                )
            )
        print(
            f"Time creating table per fluid selection: {timer_create_table_per_fluid_selection}ms, ",
            f"Time creating result table pyarrow: {timer_pyarrow}ms, ",
            f"Time creating result table pandas: {timer_pandas}ms",
        )

        return InplaceStatisticalVolumetricTableDataPerFluidSelection(
            table_data_per_fluid_selection=statistical_table_data_per_fluid_selection
        )

    async def _create_result_table_per_fluid_selection(
        self,
        table_name: str,
        result_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues] = [],
        accumulate_fluid_zones: bool = False,
    ) -> Dict[str, pa.Table]:
        # NOTE: "_TOTAL" columns are not handled

        # Detect properties and find volume names needed to calculate properties
        properties = get_properties_among_result_names(result_names)
        required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

        # Extract volume names among result names
        volume_names = list(set(result_names) - set(properties))

        # Find all volume names needed from Sumo
        all_volume_names = set(volume_names + required_volume_names_for_properties)

        # Create the raw volumetric columns from all volume names and fluid zones
        raw_volumetric_column_names = create_raw_volumetric_columns_from_volume_names_and_fluid_zones(
            all_volume_names, fluid_zones
        )

        timer = PerfTimer()
        # Get the raw volumetric table
        row_filtered_raw_table = await self._create_row_filtered_volumetric_table_data_async(
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

        volumetric_table_per_fluid_zone: Dict[FluidZone, pa.Table] = self._create_volumetric_table_per_fluid_zone(
            fluid_zones, row_filtered_raw_table
        )

        possible_selector_columns = self._inplace_volumetrics_access.get_possible_selector_columns()
        valid_selector_columns = [
            col for col in possible_selector_columns if col in row_filtered_raw_table.column_names
        ]

        result_table_per_fluid_selection: Dict[str, pa.Table] = (
            {}
        )  # TODO: Replace str key to FluidZoneSelection or array of FluidZone?
        if accumulate_fluid_zones and len(fluid_zones) > 1:
            # Build result table - accumulated across fluid zones
            # - Sum each volume column across fluid zones
            # - Calculate properties after accumulated fluid zone volumes are created
            volumetric_table_accumulated_across_fluid_zones = create_volumetric_table_accumulated_across_fluid_zones(
                volumetric_table_per_fluid_zone, valid_selector_columns
            )

            # Create fluid selection name
            fluid_selection_name = " + ".join([fluid_zone.value for fluid_zone in fluid_zones])

            # Drop BO/BG properties
            valid_properties = [prop for prop in properties if prop not in ["BO", "BG"]]

            property_columns = self._calculate_property_column_arrays(
                volumetric_table_accumulated_across_fluid_zones, valid_properties, fluid_zone=None
            )

            # Build result table (volumes and calculated properties)
            available_volume_names = [
                name for name in volume_names if name in volumetric_table_accumulated_across_fluid_zones.column_names
            ]
            result_table = volumetric_table_accumulated_across_fluid_zones.select(
                valid_selector_columns + available_volume_names
            )
            for property_name, property_column in property_columns.items():
                result_table = result_table.append_column(property_name, property_column)
            result_table_per_fluid_selection[fluid_selection_name] = result_table

        else:
            # Build result table - per fluid zone
            # - Requested volumes
            # - Calculated properties
            for fluid_zone, volumetric_table in volumetric_table_per_fluid_zone.items():
                property_columns = self._calculate_property_column_arrays(volumetric_table, properties, fluid_zone)

                # Build result table (volumes and calculated properties)
                available_volume_names = [name for name in volume_names if name in volumetric_table.column_names]
                result_table = volumetric_table.select(valid_selector_columns + available_volume_names)
                for property_name, property_column in property_columns.items():
                    result_table = result_table.append_column(property_name, property_column)

                result_table_per_fluid_selection[fluid_zone.value] = result_table

        return result_table_per_fluid_selection

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

    def _create_volumetric_table_per_fluid_zone(
        self,
        fluid_zones: List[FluidZone],
        volumetric_table: pa.Table,
    ) -> Dict[FluidZone, pa.Table]:
        """
        Create a volumetric table per fluid zone

        Extracts the columns for each fluid zone and creates a new table for each fluid zone, with
        the same identifier columns and REAL column as the original table.

        The fluid columns are stripped of the fluid zone suffix.

        Returns:
        Dict[FluidZone, pa.Table]: A dictionary with fluid zone as key and volumetric table as value


        Example:
        - Input:
            - fluid_zone: [FluidZone.OIL, FluidZone.GAS]
            - volumetric_table: pa.Table
                - volumetric_table.column_names = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]

        - Output:
            - table_dict: Dict[FluidZone, pa.Table]:
                - table_dict[FluidZone.OIL]: volumetric_table_oil
                    - volumetric_table_oil.column_names = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "HCPV"]
                - table_dict[FluidZone.GAS]: volumetric_table_gas
                    - volumetric_table_gas.column_names = ["REAL", "ZONE", "REGION", "FACIES", "GIIP", "HCPV"]

        """
        column_names: List[str] = volumetric_table.column_names

        possible_selector_columns = self._inplace_volumetrics_access.get_possible_selector_columns()
        selector_columns = [col for col in possible_selector_columns if col in column_names]

        fluid_zone_to_table_map: Dict[FluidZone, pa.Table] = {}
        for fluid_zone in fluid_zones:
            fluid_zone_name = fluid_zone.value.upper()
            fluid_columns = [name for name in column_names if name.endswith(f"_{fluid_zone_name}")]

            if not fluid_columns:
                continue

            fluid_zone_table = volumetric_table.select(selector_columns + fluid_columns)

            # Remove fluid_zone suffix from columns of fluid_zone_table
            new_column_names = [elm.replace(f"_{fluid_zone_name}", "") for elm in fluid_zone_table.column_names]
            fluid_zone_table = fluid_zone_table.rename_columns(new_column_names)

            fluid_zone_to_table_map[fluid_zone] = fluid_zone_table
        return fluid_zone_to_table_map

    def _calculate_property_column_arrays(
        self, volumetric_table: pa.Table, properties: List[str], fluid_zone: Optional[FluidZone] = None
    ) -> Dict[str, pa.array]:
        """
        Calculate property arrays as pa.array based on the volume columns in table.

        Args:
        - volumetric_table (pa.Table): Table with volumetric data
        - properties (List[str]): Name of the properties to calculate

        Returns:
        - Dict[str, pa.array]: Property as key, and array with calculated property values as value

        """

        existing_volume_columns: List[str] = volumetric_table.column_names
        property_arrays: Dict[str, pa.array] = {}

        # NOTE: If one of the volume names needed for a property is not found, the property array is not calculated

        if (
            fluid_zone == FluidZone.OIL
            and "BO" in properties
            and set(["HCPV", "STOIIP"]).issubset(existing_volume_columns)
        ):
            bo_array = calculate_property_from_volume_arrays("BO", volumetric_table["HCPV"], volumetric_table["STOIIP"])
            property_arrays["BO"] = bo_array
        if (
            fluid_zone == FluidZone.GAS
            and "BG" in properties
            and set(["HCPV", "GIIP"]).issubset(existing_volume_columns)
        ):
            bg_array = calculate_property_from_volume_arrays("BG", volumetric_table["HCPV"], volumetric_table["GIIP"])
            property_arrays["BG"] = bg_array

        if "NTG" in properties and set(["BULK", "NET"]).issubset(existing_volume_columns):
            ntg_array = calculate_property_from_volume_arrays("NTG", volumetric_table["NET"], volumetric_table["BULK"])
            property_arrays["NTG"] = ntg_array
        if "PORO" in properties and set(["BULK", "PORV"]).issubset(existing_volume_columns):
            poro_array = calculate_property_from_volume_arrays(
                "PORO", volumetric_table["PORV"], volumetric_table["BULK"]
            )
            property_arrays["PORO"] = poro_array
        if "PORO_NET" in properties and set(["PORV", "NET"]).issubset(existing_volume_columns):
            poro_net_array = calculate_property_from_volume_arrays(
                "PORO_NET", volumetric_table["PORV"], volumetric_table["NET"]
            )
            property_arrays["PORO_NET"] = poro_net_array
        if "SW" in properties and set(["HCPV", "PORV"]).issubset(existing_volume_columns):
            sw_array = calculate_property_from_volume_arrays("SW", volumetric_table["HCPV"], volumetric_table["PORV"])
            property_arrays["SW"] = sw_array

        return property_arrays
