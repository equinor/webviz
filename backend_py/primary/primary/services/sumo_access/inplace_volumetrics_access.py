import logging
from enum import Enum
from io import BytesIO
from typing import Dict, List, Optional, Sequence, Union, Tuple

import asyncio
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import TableCollection, Table
from pydantic import BaseModel

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
    MultipleDataMatchesError,
)

from ._helpers import SumoEnsemble


# Allowed categories (index column names) for the volumetric tables
ALLOWED_INDEX_COLUMN_NAMES = ["ZONE", "REGION", "FACIES"]  # , "LICENSE"]

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_INDEX_COLUMN_VALUES = ["Totals"]


class AggregateByEach(str, Enum):
    # FLUID_ZONE = "FLUID_ZONE"
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    # LICENSE = "LICENSE"
    REAL = "REAL"


class InplaceVolumetricsIndexNames(str, Enum):
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


# Allowed result names for the volumetric tables
ALLOWED_RESULT_COLUMN_NAMES = [
    "BULK_OIL",
    "BULK_WATER",
    "BULK_GAS",
    "NET_OIL",
    "NET_WATER",
    "NET_GAS",
    "PORV_OIL",
    "PORV_WATER",
    "PORV_GAS",
    "HCPV_OIL",
    "HCPV_GAS",
    "STOIIP_OIL",
    "GIIP_GAS",
    "ASSOCIATEDGAS_OIL",
    "ASSOCIATEDOIL_GAS",
]

# Columns to ignore in the volumetric tables
IGNORED_COLUMN_NAMES = [
    "REAL",
    "BULK_TOTAL",
    "NET_TOTAL",
    "PORV_TOTAL",
    "HCPV_TOTAL",
    "STOIIP_TOTAL",
    "GIIP_TOTAL",
    "ASSOCIATEDGAS_TOTAL",
    "ASSOCIATEDOIL_TOTAL",
]


class InplaceVolumetricsIndex(BaseModel):
    """Unique values for an index column in a volumetric table
    All values should ideally be strings, but it is common to see integers, especially for REGION"""

    index_name: InplaceVolumetricsIndexNames
    values: List[Union[str, int]]


class InplaceVolumetricsTableDefinition(BaseModel):
    """Definition of a volumetric table"""

    name: str
    indexes: List[InplaceVolumetricsIndex]
    result_names: List[str]


class InplaceVolumetricDataEntry(BaseModel):
    result_values: List[float]
    index_values: List[Union[str, int]]


class InplaceVolumetricData(BaseModel):
    vol_table_name: str
    result_name: str
    realizations: List[int]
    index_names: List[str]
    entries: List[InplaceVolumetricDataEntry]


LOGGER = logging.getLogger(__name__)


class InplaceVolumetricsAccess(SumoEnsemble):
    async def get_inplace_volumetrics_table_definitions_async(self) -> List[InplaceVolumetricsTableDefinition]:
        """Retrieve the table definitions for the volumetric tables"""

        timer = PerfTimer()
        vol_table_collections: TableCollection = self._case.tables.filter(
            aggregation="collection", tagname=["vol", "volumes", "inplace"], iteration=self._iteration_name
        )
        et_get_all_collections_ms = timer.lap_ms()

        vol_table_names = await vol_table_collections.names_async
        et_get_all_names_ms = timer.lap_ms()

        if len(vol_table_names) == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}",
                Service.SUMO,
            )

        tasks = [asyncio.create_task(self.get_table_definition(vol_table_name)) for vol_table_name in vol_table_names]
        table_definitions = await asyncio.gather(*tasks)
        et_get_all_table_definitions_ms = timer.lap_ms()

        LOGGER.debug(
            f"get_inplace_volumetrics_table_definitions_async: case_uuid={self._case_uuid}"
            f"iteration_name={self._iteration_name}"
            f"et_get_all_collections_ms={et_get_all_collections_ms}"
            f"et_get_all_names_ms={et_get_all_names_ms}"
            f"et_get_all_table_definitions_ms={et_get_all_table_definitions_ms}"
        )

        return table_definitions

    async def get_table_definition(self, vol_table_name: str) -> InplaceVolumetricsTableDefinition:
        vol_table_as_collection: TableCollection = self._case.tables.filter(
            aggregation="collection",
            name=vol_table_name,
            tagname=["vol", "volumes", "inplace"],
            iteration=self._iteration_name,
        )
        vol_table_name_as_arr = await vol_table_as_collection.names_async
        if len(vol_table_name_as_arr) > 1:
            raise MultipleDataMatchesError(
                f"Multiple inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={vol_table_name}",
                Service.SUMO,
            )
        vol_table_column_names = await vol_table_as_collection.columns_async

        invalid_column_names = []
        for col in vol_table_column_names:
            if col in IGNORED_COLUMN_NAMES:
                continue
            if col not in ALLOWED_INDEX_COLUMN_NAMES + ALLOWED_RESULT_COLUMN_NAMES:
                invalid_column_names.append(col)
        if invalid_column_names:
            LOGGER.warning(
                f"Invalid column names found in the volumetric table case={self._case_uuid}, iteration={self._iteration_name}, {invalid_column_names}"
            )
            # raise InvalidDataError(
            #     f"Invalid column names found in the volumetric table case={self._case_uuid}, iteration={self._iteration_name}, {invalid_column_names}",
            #     Service.SUMO,
            # )
        index_names = [col for col in vol_table_column_names if col in ALLOWED_INDEX_COLUMN_NAMES]

        if len(index_names) == 0:
            raise InvalidDataError(
                f"No index columns found in the volumetric table {self._case_uuid}, {vol_table_name}",
                Service.SUMO,
            )

        result_column_names = [col for col in vol_table_column_names if col in ALLOWED_RESULT_COLUMN_NAMES]
        if len(result_column_names) == 0:
            raise InvalidDataError(
                f"No result columns found in the volumetric table {self._case_uuid}, {vol_table_name}",
                Service.SUMO,
            )

        indexes = []

        # Need to download the table to get the unique index values
        # Picking a random result column to get the table
        sumo_table_obj = await self._get_sumo_table_async(vol_table_name, result_column_names[0])
        arrow_table = await _fetch_arrow_table_async(sumo_table_obj)

        for index_column_name in index_names:
            unique_values = arrow_table[index_column_name].unique().to_pylist()
            # Check for invalid data
            if any([val in IGNORED_INDEX_COLUMN_VALUES for val in unique_values]):
                LOGGER.warning(
                    f"Invalid index values found in the volumetric table case={self._case_uuid}, iteration={self._iteration_name}, table_name={vol_table_name}, index_name={index_column_name}, {unique_values}"
                )
            indexes.append(InplaceVolumetricsIndex(index_name=index_column_name, values=unique_values))
        return InplaceVolumetricsTableDefinition(
            name=vol_table_name,
            indexes=indexes,
            result_names=result_column_names,
        )

    async def get_aggregated_volumetric_table_data_async(
        self,
        table_name: str,
        response_names: List[str],
        aggregate_by_each_list: Sequence[AggregateByEach] = None,
        realizations: Sequence[int] = None,
        index_filter: List[InplaceVolumetricsIndex] = None,
    ) -> Dict[str, List[str | int | float]]:
        """Retrieve the aggregated volumetric data for a single table, optionally filtered by realizations and index values.

        Returns a dictionary with column name as key, and column array as value.

        Column array: List[str|int|float]

        NOTE: Name response or result_name?
        """
        timer = PerfTimer()

        response_names_set = set(response_names)

        expected_index_columns = set(["ZONE", "REGION", "FACIES"])
        all_expected_columns = set(expected_index_columns + response_names_set + set(["REAL"]))

        # Get collection of tables
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            name=table_name,
            tagname=["vol", "volumes", "inplace"],
            iteration=self._iteration_name,
            column=response_names,
        )

        num_tables_in_collection = await vol_table_collection.length_async()
        if num_tables_in_collection == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={table_name}, result_names={result_names}",
                Service.SUMO,
            )

        # Find column names not among collection columns
        collection_columns = await vol_table_collection.columns_async
        if set(collection_columns) != all_expected_columns:
            missing_result_names = all_expected_columns - set(collection_columns)
            raise InvalidDataError(
                f"Missing results: {missing_result_names}, in the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        # Find result names not among collection columns
        missing_result_names = response_names_set - set(collection_columns)
        if missing_result_names:
            raise InvalidDataError(
                f"Missing results: {missing_result_names}, in the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        # Initialize volumetric table
        vol_table: pa.Table = await vol_table_collection[0].to_arrow_async()  # TODO: Optimize download? E.g. parallel

        # Build mask for rows - default all rows
        mask = pa.array([True] * vol_table.num_rows)

        # Add mask for each index column
        for index in index_filter:
            index_column_name = index.index_name.value
            index_mask = pc.is_in(vol_table[index_column_name], value_set=pa.array(index.values))
            mask = pc.and_(mask, index_mask)

        # Add mask for realizations
        if len(realizations) > 0:
            realization_mask = pc.is_in(vol_table["REAL"], value_set=pa.array(realizations))
            mask = pc.and_(mask, realization_mask)

        # TODO: Add mask to remote IGNORED_INDEX_COLUMN_VALUES?

        filtered_vol_table = vol_table.filter(mask)
        table_index_columns = ["FACIES", "REGION", "ZONE", "REAL"]
        for i in range(1, len(vol_table_collection)):
            response_table = await vol_table_collection[i].to_arrow_async()  # TODO: Optimize download? E.g. parallel
            response_name_set = set(response_table.column_names) - set(table_index_columns)
            if len(response_name_set) != 1:
                print(f"Table {response_table.name} has more than one column for response")
                continue

            response_name = list(response_name_set)[0]
            if response_name not in response_names_set:
                print(
                    f"Table {response_table.name} returns response {response_name}, which is not among columns of interest: {response_names_set}"
                )
                continue

            # Add response column, filtered by mask, to table
            filtered_response_column = pc.filter(response_table[response_name], mask)
            filtered_vol_table = filtered_vol_table.append_column(response_name, filtered_response_column)

        # Aggregate the filtered pyarrow Table
        if len(aggregate_by_each_list) == 0:
            return filtered_vol_table

        # Group by each of the index columns
        aggregate_by_each = [col.value for col in aggregate_by_each_list]
        aggregated_vol_table = filtered_vol_table.group_by(aggregate_by_each).aggregate(
            [(result_name, "mean") for result_name in response_names_set]
        )

        # Convert to dict with column name as key, and column array as value
        aggregated_vol_table_dict = aggregated_vol_table.to_pydict()

        return aggregated_vol_table_dict

    async def get_volumetric_data_async(
        self,
        table_name: str,
        result_name: str,
        realizations: Sequence[int],
        index_filter: List[InplaceVolumetricsIndex],
    ) -> InplaceVolumetricData:
        """Retrieve the volumetric data for a single result (e.g. STOIIP_OIL), optionally filtered by realizations and index values."""
        timer = PerfTimer()
        if result_name not in ALLOWED_RESULT_COLUMN_NAMES:
            raise InvalidDataError(
                f"Invalid result name {result_name} for the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        sumo_table_obj = await self._get_sumo_table_async(table_name, result_name)
        et_get_table_metadata_ms = timer.lap_ms()

        arrow_table = await _fetch_arrow_table_async(sumo_table_obj)
        et_fetch_arrow_table_ms = timer.lap_ms()

        if realizations is not None:
            arrow_table = _filter_arrow_table_by_inclusion(arrow_table, "REAL", realizations)

        # Get the index columns
        index_columns = [col for col in arrow_table.column_names if col in ALLOWED_INDEX_COLUMN_NAMES]

        # Filter invalid data. Hopefully TMP
        for index_column in index_columns:
            arrow_table = _filter_arrow_table_by_exclusion(arrow_table, index_column, IGNORED_INDEX_COLUMN_VALUES)

        # Filter on selected index
        for index in index_filter:
            arrow_table = _filter_arrow_table_by_inclusion(arrow_table, index.index_name, index.values)

        grouped_table = arrow_table.group_by(index_columns + ["REAL"]).aggregate([(result_name, "sum")]).sort_by("REAL")

        arrow_table = grouped_table.group_by(index_columns).aggregate(
            [(result_name + "_sum", "list"), ("REAL", "list")]
        )

        # Rename columns'
        arrow_table = arrow_table.rename_columns([*index_columns, "result_values", "realizations"])
        data_dict = arrow_table.to_pydict()
        num_entries = len(data_dict[next(iter(data_dict))])
        if num_entries == 0:
            raise NoDataError(
                f"No data found in the volumetric table {self._case_uuid}, {table_name}, {result_name}",
                Service.SUMO,
            )
        realizations_sequence = data_dict["realizations"][0]
        entries: List[InplaceVolumetricDataEntry] = []
        for i in range(num_entries):
            entry = InplaceVolumetricDataEntry(
                result_values=data_dict.get("result_values")[i],
                index_values=[data_dict.get(index_name)[i] for index_name in index_columns],
            )
            entries.append(entry)

        volumetric_data = InplaceVolumetricData(
            vol_table_name=table_name,
            result_name=result_name,
            entries=entries,
            index_names=index_columns,
            realizations=realizations_sequence,
        )
        et_group_and_aggregate_ms = timer.lap_ms()
        LOGGER.debug(
            f"get_volumetric_data_async: case_uuid={self._case_uuid}, iteration_name={self._iteration_name}, et_get_table_metadata_ms={et_get_table_metadata_ms}, et_fetch_arrow_table_ms={et_fetch_arrow_table_ms}, et_group_and_aggregate_ms={et_group_and_aggregate_ms}"
        )
        return volumetric_data

    async def _get_sumo_table_async(self, table_name: str, result_name: Optional[str] = None) -> Table:
        """Get a sumo table object. Expecting only one table to be found.
        A result_name(column) is optional. If provided, the table will be filtered based on the result_name.
        If not provided apparently a table with a random (first found?) column will be returned"""

        vol_table_as_collection: TableCollection = self._case.tables.filter(
            aggregation="collection",
            name=table_name,
            tagname=["vol", "volumes", "inplace"],
            iteration=self._iteration_name,
            column=result_name,
        )
        vol_table_name_as_arr = await vol_table_as_collection.names_async
        if len(vol_table_name_as_arr) == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name},, table_name={vol_table_name_as_arr}",
                Service.SUMO,
            )
        if len(vol_table_name_as_arr) > 1:
            raise MultipleDataMatchesError(
                f"Multiple inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={vol_table_name_as_arr}",
                Service.SUMO,
            )
        sumo_table_obj = await vol_table_as_collection.getitem_async(0)
        return sumo_table_obj


async def _fetch_arrow_table_async(sumo_table_obj: Table) -> pa.Table:
    """Fetch arrow table from sumo blob store."""
    byte_stream: BytesIO = await sumo_table_obj.blob_async
    arrow_table: pa.Table = pq.read_table(byte_stream)
    return arrow_table


def _filter_arrow_table_by_inclusion(
    arrow_table: pa.Table, column_name: str, column_values: List[Union[str, float]]
) -> pa.Table:
    """Filter arrow table to only include specific values."""
    mask = pc.is_in(arrow_table[column_name], value_set=pa.array(column_values))
    arrow_table = arrow_table.filter(mask)
    return arrow_table


def _filter_arrow_table_by_exclusion(
    arrow_table: pa.Table, column_name: str, column_values: List[Union[str, float]]
) -> pa.Table:
    """Filter arrow table to exclude specific values."""
    mask = pc.is_in(arrow_table[column_name], value_set=pa.array(column_values))
    mask = pc.invert(mask)
    arrow_table = arrow_table.filter(mask)
    return arrow_table


def group_and_aggregate(
    arrow_table: pa.Table,
    result_name: str,
    primary_group_by: Optional[str] = None,
    secondary_group_by: Optional[str] = None,
) -> List[InplaceVolumetricDataEntry]:
    entries = []
    group_columns = []  # "INDEX"-columns
    if primary_group_by:
        group_columns.append(primary_group_by)
    if secondary_group_by:
        group_columns.append(secondary_group_by)
    if group_columns:
        # Group by provided columns and REAL, then sum the results
        grouped_table = arrow_table.group_by(group_columns + ["REAL"]).aggregate([(result_name, "sum")]).sort_by("REAL")

        # Remove REAL from the grouping and collect sums and realizations into lists
        arrow_table = grouped_table.group_by(group_columns).aggregate(
            [(result_name + "_sum", "list"), ("REAL", "list")]
        )
        # Rename columns'
        arrow_table = arrow_table.rename_columns([*group_columns, "result_values", "realizations"])
        data_dict = arrow_table.to_pydict()
        num_entries = len(data_dict[next(iter(data_dict))])

        for i in range(num_entries):
            # Build each entry by accessing elements by index
            entry = InplaceVolumetricDataEntry(
                result_values=data_dict.get("result_values")[i],
                realizations=data_dict["realizations"][i],
                primary_group_value=data_dict.get(primary_group_by)[i] if primary_group_by else None,
                secondary_group_value=data_dict.get(secondary_group_by)[i] if secondary_group_by else None,
            )
            entries.append(entry)

    return entries
