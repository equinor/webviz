import asyncio
from typing import List, Optional

from fmu.sumo.explorer.objects import Case, TableCollection

import pyarrow as pa

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client, create_sumo_case_async
from ..service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
)

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]

# Allowed raw volumetric columns - from FMU Standard:
# Ref: https://github.com/equinor/fmu-dataio/blob/66e9683de5943d1b982c14ac926cf13007fc2bad/src/fmu/dataio/export/rms/volumetrics.py#L25-L47
ALLOWED_RAW_VOLUMETRIC_COLUMNS = [
    "REAL",
    "ZONE",
    "REGION",
    "LICENSE",
    "FACIES",
    "BULK_OIL",
    "NET_OIL",
    "PORV_OIL",
    "HCPV_OIL",
    "STOIIP_OIL",
    "ASSOCIATEDGAS_OIL",
    "BULK_GAS",
    "NET_GAS",
    "PORV_GAS",
    "HCPV_GAS",
    "GIIP_GAS",
    "ASSOCIATEDOIL_GAS",
    "BULK_TOTAL",
    "NET_TOTAL",
    "PORV_TOTAL",
]

POSSIBLE_IDENTIFIER_COLUMNS = ["ZONE", "REGION", "FACIES", "LICENSE"]


class InplaceVolumetricsAccess:
    def __init__(self, case: Case, case_uuid: str, iteration_name: str):
        self._case: Case = case
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(
        cls, access_token: str, case_uuid: str, iteration_name: str
    ) -> "InplaceVolumetricsAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return InplaceVolumetricsAccess(case=case, case_uuid=case_uuid, iteration_name=iteration_name)

    @staticmethod
    def get_possible_identifier_columns() -> List[str]:
        return POSSIBLE_IDENTIFIER_COLUMNS

    @staticmethod
    def get_possible_selector_columns() -> List[str]:
        """
        The identifier columns and REAL column represent the selector columns of the volumetric table.
        """
        return InplaceVolumetricsAccess.get_possible_identifier_columns() + ["REAL"]

    async def get_inplace_volumetrics_table_names_async(self) -> List[str]:
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            tagname=["vol", "volumes", "inplace"],
            iteration=self._iteration_name,
        )
        table_names = await vol_table_collection.names_async
        return table_names

    async def get_inplace_volumetrics_table_no_throw_async(
        self, table_name: str, column_names: Optional[set[str]] = None
    ) -> Optional[pa.Table]:
        """
        Get inplace volumetrics data for list of columns for given case and iteration as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Note: This method does not throw an exception if requested column names are not found.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the available requested column names.
        """
        # Get collection of tables per requested column
        requested_columns = column_names if column_names is None else list(column_names)
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            name=table_name,
            tagname=["vol", "volumes", "inplace"],
            iteration=self._iteration_name,
            column=requested_columns,
        )

        # Assemble tables into a single table
        vol_table: pa.Table = await self._assemble_volumetrics_table_collection_into_single_table_async(
            vol_table_collection=vol_table_collection,
            table_name=table_name,
            column_names=column_names,
        )

        return vol_table

    async def get_inplace_volumetrics_table_async(
        self, table_name: str, column_names: Optional[set[str]] = None
    ) -> pa.Table:
        """
        Get inplace volumetrics data for list of columns for given case and iteration as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the requested column names.
        """

        # Get collection of tables per requested column
        requested_columns = column_names if column_names is None else list(column_names)
        vol_table_collection = self._case.tables.filter(
            aggregation="collection",
            name=table_name,
            tagname=["vol", "volumes", "inplace"],
            iteration=self._iteration_name,
            column=requested_columns,
        )

        # Expected columns
        # - "REAL" is not an index in metadata, but is an expected column in the tables from collection
        expected_repeated_collection_columns = set(self.get_possible_selector_columns())

        # Find column names not among collection columns
        collection_columns = await vol_table_collection.columns_async
        remaining_collection_columns = set(collection_columns) - expected_repeated_collection_columns

        if column_names is not None and column_names != remaining_collection_columns:
            missing_column_names = column_names - remaining_collection_columns
            raise InvalidDataError(
                f"Missing requested columns: {missing_column_names}, in the volumetric table collection {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        # Assemble tables into a single table
        vol_table: pa.Table = await self._assemble_volumetrics_table_collection_into_single_table_async(
            vol_table_collection=vol_table_collection,
            table_name=table_name,
            column_names=column_names,
        )

        # Validate the table columns
        expected_table_columns = expected_repeated_collection_columns
        if column_names:
            expected_table_columns.update(column_names)
            if not expected_table_columns.issubset(set(vol_table.column_names)):
                missing_columns = expected_table_columns - set(vol_table.column_names)
                raise InvalidDataError(
                    f"Missing columns: {missing_columns}, in the assembled volumetric table {self._case_uuid}, {table_name}",
                    Service.SUMO,
                )

        return vol_table

    async def _assemble_volumetrics_table_collection_into_single_table_async(
        self,
        vol_table_collection: TableCollection,
        table_name: str,
        column_names: Optional[set[str]] = None,
    ) -> pa.Table:
        """
        Retrieve the inplace volumetrics tables from Sumo and assemble them into a single table.

        Index columns: ZONE, REGION, FACIES, REAL, LICENSE
        Volume columns: column_names

        """
        timer = PerfTimer()
        timer.lap_ms()
        num_tables_in_collection = await vol_table_collection.length_async()
        vol_table_columns = await vol_table_collection.columns_async
        if num_tables_in_collection == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={table_name}, column_names={column_names}",
                Service.SUMO,
            )
        time_num_tables_and_collection_columns = timer.lap_ms()

        # Download tables in parallel
        tasks = [asyncio.create_task(table.to_arrow_async()) for table in vol_table_collection]
        arrow_tables: list[pa.Table] = await asyncio.gather(*tasks)
        time_async_download_ms = timer.lap_ms()

        if len(arrow_tables) == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={table_name}, column_names={column_names}",
                Service.SUMO,
            )

        # Expected selector columns
        possible_selector_columns = set(self.get_possible_selector_columns())
        expected_selector_columns = possible_selector_columns.intersection(vol_table_columns)

        # Initialize volumetric table
        volumes_table: pa.Table | None = None

        # Build table by adding response columns
        for volume_table in arrow_tables:
            # Find volumes among columns - expect only one volume column
            volume_names_set = set(volume_table.column_names) - expected_selector_columns

            if column_names is None and len(volume_names_set) == 0:
                # When no column names are specified, we skip tables with only selector columns and no volume columns
                # E.g. if a selector columns is incorrectly added as a volume column - we skip the table
                continue

            # When requesting volume columns, we expect one volume name per table in the collection
            if len(volume_names_set) == 0:
                raise InvalidDataError(
                    f"Table {table_name} has collection without volume column. Collection only has columns defined as selectors: {volume_table.column_names}",
                    Service.SUMO,
                )
            if len(volume_names_set) != 1:
                raise InvalidDataError(
                    f"Table {table_name} has collection with more than one column for volume: {volume_names_set}",
                    Service.SUMO,
                )

            volume_name = list(volume_names_set)[0]
            if volume_name not in ALLOWED_RAW_VOLUMETRIC_COLUMNS:
                # Skip invalid volume columns
                continue

            # Initialize table with first valid volume column
            if volumes_table is None:
                volumes_table = volume_table
                continue

            # Add volume column to table
            volume_column = volume_table[volume_name]
            volumes_table = volumes_table.append_column(volume_name, volume_column)

        time_build_single_table_ms = timer.lap_ms()

        if volumes_table is None:
            raise NoDataError(
                f"No valid inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={table_name}, column_names={column_names}",
                Service.SUMO,
            )

        print(
            f"Access Volumetric collection tables: count tables and column names: {time_num_tables_and_collection_columns}ms, "
            f"collection download: {time_async_download_ms}ms, "
            f"assemble into single table: {time_build_single_table_ms}ms, "
            f"Total time: {timer.elapsed_ms()}ms"
        )

        return volumes_table
