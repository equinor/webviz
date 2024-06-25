from enum import StrEnum
from dataclasses import dataclass
from typing import Dict, List, Sequence, Union

import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_acces_NEW import InplaceVolumetricsAccess


class InplaceVolumetricsIndexNames(StrEnum):
    """
    Definition of valid index names for an inplace volumetrics table
    """

    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


@dataclass
class InplaceVolumetricsIndex:
    """
    Unique values for an index column in an inplace volumetrics table

    NOTE: Ideally all values should be strings, but it is possible that some values are integers - especially for REGION
    """

    index_name: InplaceVolumetricsIndexNames
    values: List[Union[str, int]]  # List of values: str or int


@dataclass
class InplaceVolumetricsTableDefinition:
    """Definition of a volumetric table"""

    name: str
    indexes: List[InplaceVolumetricsIndex]
    result_names: List[str]


class AggregateByEach(StrEnum):
    # FLUID_ZONE = "FLUID_ZONE"
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    # LICENSE = "LICENSE"
    REAL = "REAL"


class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    Water = "Water"  # TODO: Remove or keep?


class InplaceVolumetricsAssembler:
    def __init__(self, inplace_volumetrics_access: InplaceVolumetricsAccess):
        self._inplace_volumetrics_access = inplace_volumetrics_access

    @staticmethod
    def get_volumetric_columns_from_response_names_and_fluid_zones(
        response_names: set[str], fluid_zones: List[FluidZone]
    ) -> list[str]:
        """
        Function to get volumetric columns from response names and fluid zones
        """

        volumetric_columns = []

        for fluid_zone in fluid_zones:
            for response_name in response_names:
                volumetric_columns.append(f"{response_name}_{fluid_zone.value}")

        return volumetric_columns

    async def get_aggregated_volumetric_table_data_async(
        self,
        table_name: str,
        response_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        index_filter: List[InplaceVolumetricsIndex] = None,
        aggregate_by_each_list: Sequence[AggregateByEach] = None,
    ) -> Dict[str, List[str | int | float]]:

        if realizations is not None and len(realizations) == 0:
            return {}

        # NOTE: How to ensure that all volumetric columns are present in the table?
        # - Send Dict: {response_name: [fluid_zone]} from front-end based on metadata?
        volumetric_columns: list[str] = self.get_volumetric_columns_from_response_names_and_fluid_zones(
            response_names, fluid_zones
        )

        # Get the inplace volumetrics table from collection in Sumo
        inplace_volumetrics_table: pa.Table = self._inplace_volumetrics_access.get_inplace_volumetrics_table_async(
            table_name=table_name, column_names=volumetric_columns
        )

        # Build mask for rows - default all rows
        mask = pa.array([True] * inplace_volumetrics_table.num_rows)

        # Add mask for each index filter
        for index in index_filter:
            index_column_name = index.index_name.value
            index_mask = pc.is_in(inplace_volumetrics_table[index_column_name], value_set=pa.array(index.values))
            mask = pc.and_(mask, index_mask)

        # Add mask for realizations
        if realizations is not None:

            realization_mask = pc.is_in(inplace_volumetrics_table["REAL"], value_set=pa.array(realizations))
            mask = pc.and_(mask, realization_mask)

        filtered_table = inplace_volumetrics_table.filter(mask)

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
