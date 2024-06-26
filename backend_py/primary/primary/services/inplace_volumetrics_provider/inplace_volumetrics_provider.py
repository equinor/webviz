from typing import Any, Dict, List, Sequence

import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_acces_NEW import InplaceVolumetricsAccess
from primary.services.sumo_access.inplace_volumetrics_types import (
    AggregateByEach,
    FluidZone,
    InplaceVolumetricsIndex,
)

from ._conversion._conversion import (
    get_available_properties_from_volume_names,
    get_fluid_zones,
    get_properties_in_response_names,
    get_required_volume_names_from_properties,
    get_volume_names_from_raw_volumetric_column_names,
    create_raw_volumetric_columns_from_volume_names_and_fluid_zones,
)


# - InplaceVolumetricsConstructor
# - InplaceVolumetricsFabricator
# - InplaceVolumetricsDataManufacturer
class InplaceVolumetricsProvider:
    """
    This class provides an interface for interacting with definitions used in front-end for assembling and providing
    metadata and inplace volumetrics table data

    The class interacts with the InplaceVolumetricsAccess class to retrieve data from Sumo and assemble it into a format
    that can be used in the front-end. It also performs validation of the data and aggregation methods where needed.

    The provider contains conversion from response names, properties and fluid zones into volumetric column names that can
    be used to fetch data from Sumo.

    Front-end: responses = volume_columns + properties

    Sumo: volumetric_column_names = responses + fluid_zones


    """

    def __init__(self, inplace_volumetrics_access: InplaceVolumetricsAccess):
        self._inplace_volumetrics_access = inplace_volumetrics_access

    # TODO: When having metadata, provide all column names, and the get the possible properties from the response names
    # Provide the available properties from metadata, without suffix and provide possible FluidZones
    async def get_volumetric_table_metadata(self) -> Any:
        raw_volumetric_column_names = await self._inplace_volumetrics_access.get_volumetric_column_names_async()

        fluid_zones = get_fluid_zones(raw_volumetric_column_names)
        volume_names = get_volume_names_from_raw_volumetric_column_names(raw_volumetric_column_names)
        available_property_names = get_available_properties_from_volume_names(volume_names) 
        responses = list(set([volume_names+available_property_names]))

        # TODO: Consider 
        # responses_info: Dict[str, List[FluidZone]] = {}
        # I.e.: responses_info["STOIIP"] = [FluidZone.OIL], etc.

        return {
            "name": "INSERT TABLE NAME",
            "fluid_zones": fluid_zones,
            "responses": responses,
        }
   

    async def get_aggregated_volumetric_table_data_async(
        self,
        table_name: str,
        response_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        index_filter: List[InplaceVolumetricsIndex] = None,
        aggregate_by_each_list: Sequence[AggregateByEach] = None,
    ) -> Dict[str, List[str | int | float]]:

        # Detect properties and find volume names needed to calculate properties
        properties = get_properties_in_response_names(response_names)
        required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

        # Extract volume names among response names
        volume_names = list(set(response_names) - set(properties))

        # Find all volume names needed from Sumo
        all_volume_names = set(volume_names + required_volume_names_for_properties)

        # Create the raw volumetric columns from all volume names and fluid zones
        raw_volumetric_column_names = create_raw_volumetric_columns_from_volume_names_and_fluid_zones(
            all_volume_names, fluid_zones
        )

        # Get the volumetric table
        filtered_table = await self._create_filtered_volumetric_table_data_async(
            table_name=table_name,
            volumetric_columns=raw_volumetric_column_names,
            realizations=realizations,
            index_filter=index_filter,
        )

        # TODO: Transform filtered table to table with response names as columns and an additional FLUID_ZONE column before aggregation?
        # Remove suffixes from column names of table?

        if len(aggregate_by_each_list) == 0:
            return filtered_table.to_pydict()

        # Group by each of the index columns (always aggregate by realization)
        aggregate_by_each = set([col.value for col in aggregate_by_each_list])

        columns_to_group_by_for_sum = aggregate_by_each.copy()
        if "REAL" not in columns_to_group_by_for_sum:
            columns_to_group_by_for_sum.add("REAL")

        # Aggregate sum for each response name after grouping
        aggregated_vol_table = filtered_table.group_by(columns_to_group_by_for_sum).aggregate(
            [(response_name, "sum") for response_name in response_names]
        )
        suffix_to_remove = "_sum"

        # ********************* AGGREGATE BY REALIZATION *********************

        # If aggregate_by_each does not contain "REAL", then aggregate mean across realizations
        if "REAL" not in aggregate_by_each:
            aggregated_vol_table = aggregated_vol_table.group_by(aggregate_by_each).aggregate(
                [(f"{response_name}_sum", "mean") for response_name in response_names]
            )
            suffix_to_remove = "_sum_mean"

        # Remove suffix from column names
        column_names = aggregated_vol_table.column_names
        new_column_names = [column_name.replace(suffix_to_remove, "") for column_name in column_names]
        aggregated_vol_table = aggregated_vol_table.rename_columns(new_column_names)

        # Convert to dict with column name as key, and column array as value
        aggregated_vol_table_dict = aggregated_vol_table.to_pydict()

        return aggregated_vol_table_dict


    async def _create_filtered_volumetric_table_data_async(
        self,
        table_name: str,
        volumetric_columns: set[str],
        realizations: Sequence[int] = None,
        index_filter: List[InplaceVolumetricsIndex] = None,
    ) -> pa.Table:
        """
        Create table filtered on index values and realizations
        """
        if realizations is not None and len(realizations) == 0:
            return {}

        # Get the inplace volumetrics table from collection in Sumo
        # TODO:
        # Soft vs hard fail depends on detail level when building the volumetric columns from retrieved response names + fluid zones
        # Soft fail: get_inplace_volumetrics_table_no_throw_async() does not require matching volumetric column names
        # Hard fail: get_inplace_volumetrics_table_async() throws an exception if requested column names are not found
        inplace_volumetrics_table: pa.Table = self._inplace_volumetrics_access.get_inplace_volumetrics_table_async(
            table_name=table_name, column_names=volumetric_columns
        )

        # Build mask for rows - default all rows
        mask = pa.array([True] * inplace_volumetrics_table.num_rows)

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

        # Add mask for each index filter
        for index in index_filter:
            index_column_name = index.index_name.value
            index_mask = pc.is_in(inplace_volumetrics_table[index_column_name], value_set=pa.array(index.values))
            mask = pc.and_(mask, index_mask)

        filtered_table = inplace_volumetrics_table.filter(mask)
        return filtered_table