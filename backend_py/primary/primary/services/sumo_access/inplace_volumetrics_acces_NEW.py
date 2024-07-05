from typing import List, Optional
from fmu.sumo.explorer.objects import Case, TableCollection

import asyncio
import pyarrow as pa
import pyarrow.compute as pc

from ._helpers import create_sumo_client, create_sumo_case_async
from ..service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
)

from webviz_pkg.core_utils.perf_timer import PerfTimer

# Allowed categories (index column names) for the volumetric tables
ALLOWED_IDENTIFIER_COLUMN_NAMES = ["ZONE", "REGION", "FACIES"]  # , "LICENSE"]

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]


class InplaceVolumetricsAccess:
    _expected_identifier_columns = ["ZONE", "REGION", "FACIES", "LICENSE"]

    def __init__(self, case: Case, case_uuid: str, iteration_name: str):
        self._case: Case = case
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    def get_expected_identifier_columns(self) -> List[str]:
        return self._expected_identifier_columns

    @classmethod
    async def from_case_uuid_async(
        cls, access_token: str, case_uuid: str, iteration_name: str
    ) -> "InplaceVolumetricsAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return InplaceVolumetricsAccess(case=case, case_uuid=case_uuid, iteration_name=iteration_name)

    def expected_index_columns(self) -> List[str]:
        return self._expected_index_columns

    def possible_selector_columns(self) -> List[str]:
        """
        The index columns and REAL column represent the selector columns of the volumetric table.
        """
        return self.expected_index_columns() + ["REAL"]

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
        expected_repeated_collection_columns = set(self.possible_selector_columns())

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

        num_tables_in_collection = await vol_table_collection.length_async()
        vol_table_columns = await vol_table_collection.columns_async
        if num_tables_in_collection == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={table_name}, column_names={column_names}",
                Service.SUMO,
            )

        # Download tables in parallel
        tasks = [asyncio.create_task(table.to_arrow_async()) for table in vol_table_collection]
        arrow_tables: list[pa.Table] = await asyncio.gather(*tasks)

        if len(arrow_tables) == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={table_name}, column_names={column_names}",
                Service.SUMO,
            )

        # Expected columns
        possible_repeated_collection_columns = set(self.possible_selector_columns())
        expected_repeated_collection_columns = possible_repeated_collection_columns.intersection(vol_table_columns)

        # Initialize volumetric table
        volumes_table: pa.Table = arrow_tables[0]

        # Build table by adding response columns
        for i in range(1, len(arrow_tables)):
            volume_table: pa.Table = arrow_tables[i]

            # Expect only one column in addition to the index columns, i.e. the volume
            volume_names_set = set(volume_table.column_names) - expected_repeated_collection_columns
            if len(volume_names_set) == 0:
                raise InvalidDataError(
                    f"Table {table_name} has collection without detected volume column. Collection has column names {volume_table.column_names}",
                    Service.SUMO,
                )
            if len(volume_names_set) != 1:
                raise InvalidDataError(
                    f"Table {table_name} has collection with more than one column for volume: {volume_names_set}",
                    Service.SUMO,
                )

            # Add volume column to table
            volume_name = list(volume_names_set)[0]
            volume_column = volume_table[volume_name]
            volumes_table = volumes_table.append_column(volume_name, volume_column)

        return volumes_table
