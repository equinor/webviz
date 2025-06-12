import asyncio
import logging

import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import (
    InvalidDataError,
    InvalidParameterError,
    MultipleDataMatchesError,
    NoDataError,
    Service,
)

LOGGER = logging.getLogger(__name__)


class ArrowTableLoader:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._req_table_name: str | None = None
        self._req_content_types: list[str] | None = None
        self._req_tagname: str | None = None

    def require_table_name(self, table_name: str) -> None:
        self._req_table_name = table_name

    def require_content_type(self, content_type: str | list[str]) -> None:
        self._req_content_types = content_type if isinstance(content_type, list) else [content_type]

    def require_tagname(self, tagname: str) -> None:
        self._req_tagname = tagname

    async def get_aggregated_single_column_async(
        self,
        column_name: str,
    ) -> pa.Table:
        """Filters for a single table and column, aggregates the column (if it does not already exist),
        and returns the result as an Arrow table"""

        perf_metrics = PerfMetrics()

        sc_tables_basis = SearchContext(sumo=self._sumo_client).tables.filter(
            uuid=self._case_uuid,
            iteration=self._iteration_name,
            column=column_name,
            name=self._req_table_name,
            content=self._req_content_types,
            tagname=self._req_tagname,
        )

        sc_existing_agg_tables = sc_tables_basis.filter(aggregation="collection", realization=False)
        existing_agg_table_count = await sc_existing_agg_tables.length_async()
        perf_metrics.record_lap("locate")

        if existing_agg_table_count > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for: {self._make_req_info_str()}", Service.SUMO)

        sumo_table_obj: Table | None = None

        if existing_agg_table_count == 1:
            # We're probably good and have an already aggregated table, but we also need to check if the
            # aggregation has become stale with regards to the underlying realizations.
            # Since we assume that most of the time we will have valid aggregations, we optimistically do
            # fetching of the blob payload contents and validation concurrently.
            existing_agg_table_obj: Table = await sc_existing_agg_tables.getitem_async(0)
            perf_metrics.record_lap("get-sumo-obj")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(existing_agg_table_obj.blob_async)
                validate_task = tg.create_task(_is_agg_valid_for_reals_async(existing_agg_table_obj, sc_tables_basis))
            perf_metrics.record_lap("fetch-and-validate")

            if validate_task.result():
                sumo_table_obj = existing_agg_table_obj
            else:
                LOGGER.debug(
                    f"ArrowTableLoader.get_aggregated_single_column() found stale aggregation for: {column_name=}, {self._make_req_info_str()}"
                )

        if not sumo_table_obj:
            # No valid aggregated table exists for the column, we need to aggregate it
            LOGGER.debug(
                f"ArrowTableLoader.get_aggregated_single_column() doing aggregation for: {column_name=}, {self._make_req_info_str()}"
            )

            sc_agg_input_tables = sc_tables_basis.filter(aggregation=False, realization=True)

            # If we have a wildcard table name, we must ensure that we're down to a single table name in the search context
            if self._req_table_name is None:
                existing_agg_table_names = await sc_existing_agg_tables.names_async
                if len(existing_agg_table_names) > 1:
                    raise MultipleDataMatchesError(
                        f"Multiple tables found for {self._make_req_info_str()}", Service.SUMO
                    )

            if await sc_agg_input_tables.length_async() == 0:
                raise NoDataError(
                    f"No per-realization tables found for: {column_name=}, {self._make_req_info_str()}", Service.SUMO
                )

            # Does the aggregation and gets the blob (also writes the resulting aggregation back into Sumo)
            sumo_table_obj = await sc_agg_input_tables.aggregate_async(columns=[column_name], operation="collection")
            perf_metrics.record_lap("aggregate")

        arrow_table: pa.Table = await sumo_table_obj.to_arrow_async()
        perf_metrics.record_lap("to-arrow")

        LOGGER.debug(
            f"ArrowTableLoader.get_aggregated_single_column() took: {perf_metrics.to_string()}, {column_name=}, {self._make_req_info_str()}"
        )

        return arrow_table

    async def get_aggregated_multiple_columns_async(
        self,
        column_names: list[str],
    ) -> pa.Table:
        """
        Fetches aggregated table for multiple columns async and assembles them into a single Arrow table
        """
        if not column_names:
            raise InvalidParameterError(
                f"Cannot fetch aggregated tables for empty column list: {self._make_req_info_str()}", Service.SUMO
            )

        # Fetch the aggregated table for each column
        async with asyncio.TaskGroup() as tg:
            column_name_task_dict = {
                column_name: tg.create_task(self.get_aggregated_single_column_async(column_name))
                for column_name in column_names
            }
        column_name_and_aggregated_table_pairs = [(name, task.result()) for name, task in column_name_task_dict.items()]

        if not column_name_and_aggregated_table_pairs:
            raise NoDataError(f"No aggregated tables found for: {self._make_req_info_str()}", Service.SUMO)

        # If we only have one table, we can just return it directly
        if len(column_name_and_aggregated_table_pairs) == 1:
            return column_name_and_aggregated_table_pairs[0][1]

        # Since we're going to just append the "value" columns below, we need to ensure that the shared columns
        # (the columns that are not in column_names) are equal across all tables.
        first_column_name, first_aggregated_table = column_name_and_aggregated_table_pairs[0]
        shared_columns_first_table = first_aggregated_table.drop(first_column_name)
        for i in range(1, len(column_name_and_aggregated_table_pairs)):
            this_column_name, this_aggregated_table = column_name_and_aggregated_table_pairs[i]
            shared_columns_this_table = this_aggregated_table.drop(this_column_name)
            if not shared_columns_first_table.equals(shared_columns_this_table):
                if shared_columns_first_table.column_names != shared_columns_this_table.column_names:
                    raise InvalidDataError(
                        f"The shared columns are not equal: Aggregated table for {first_column_name} has shared columns {shared_columns_first_table.column_names}, and aggregated table for {this_column_name} has shared columns {shared_columns_this_table.column_names}",
                        Service.SUMO,
                    )
                raise InvalidDataError(
                    f"The shared columns are not equal: Aggregated table for {first_column_name} and aggregated table for {this_column_name} has same shared columns {shared_columns_this_table.column_names}. Although the column names match, their contents (values or order) differ.",
                    Service.SUMO,
                )

        # Now we can merge the tables by appending the "value" columns
        merged_aggregated_table = first_aggregated_table
        for i in range(1, len(column_name_and_aggregated_table_pairs)):
            column_name, aggregated_table = column_name_and_aggregated_table_pairs[i]
            merged_aggregated_table = merged_aggregated_table.append_column(column_name, aggregated_table[column_name])

        return merged_aggregated_table

    async def get_single_realization_async(self, realization: int) -> pa.Table:
        """Get a pyarrow table for a given realization"""

        perf_metrics = PerfMetrics()

        sc_tables = SearchContext(sumo=self._sumo_client).tables.filter(
            uuid=self._case_uuid,
            iteration=self._iteration_name,
            realization=realization,
            name=self._req_table_name,
            content=self._req_content_types,
            tagname=self._req_tagname,
        )

        table_count = await sc_tables.length_async()
        perf_metrics.record_lap("locate")

        if table_count == 0:
            raise NoDataError(f"No tables found for: {self._make_req_info_str()}", Service.SUMO)

        if table_count > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for: {self._make_req_info_str()}", Service.SUMO)

        sumo_table_obj: Table = await sc_tables.getitem_async(0)
        perf_metrics.record_lap("get-obj")

        arrow_table: pa.Table = await sumo_table_obj.to_arrow_async()
        perf_metrics.record_lap("to-arrow")

        LOGGER.debug(
            f"ArrowTableLoader.get_single_realization() took: {perf_metrics.to_string()}, {realization=}, {self._make_req_info_str()}"
        )

        return arrow_table

    def _make_req_info_str(self) -> str:
        info_str = f"table_name={self._req_table_name}, content_type={self._req_content_types}"
        if self._req_tagname is not None:
            info_str += f", tagname={self._req_tagname}"
        return info_str


async def _is_agg_valid_for_reals_async(agg_sumo_table_obj: Table, sc_tables: SearchContext) -> bool:
    """
    Check if the aggregation is valid with regards to the underlying realizations.
    """
    agg_ts = agg_sumo_table_obj.metadata["_sumo"]["timestamp"]

    sc_real_tables = sc_tables.filter(realization=True, aggregation=False)
    sc_real_tables_older_than_agg = sc_real_tables.filter(complex={"range": {"_sumo.timestamp": {"lt": agg_ts}}})

    # Get the realization ids for the tables that are older than the aggregation
    real_ids_older_than_agg = await sc_real_tables_older_than_agg.realizationids_async

    # Get the current realization count
    current_real_count = await sc_real_tables.filter().length_async()

    # If there are any new realizations the aggregation is invalid
    if current_real_count != len(real_ids_older_than_agg):
        return False

    # Compare the set of realization ids that are older than the aggregation with the realization
    # ids that were actually used to construct the aggregation.
    if set(real_ids_older_than_agg) != set(agg_sumo_table_obj.metadata["fmu"]["aggregation"]["realization_ids"]):
        return False

    return True
