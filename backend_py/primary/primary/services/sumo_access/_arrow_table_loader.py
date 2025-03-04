import asyncio
import logging

import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service

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

        sumo_table_obj: Table
        if existing_agg_table_count == 1:
            # We're good, just get hold of the single object and fetch the blob into the object
            sumo_table_obj = await sc_existing_agg_tables.getitem_async(0)
            await sumo_table_obj.blob_async
            perf_metrics.record_lap("fetch")
        else:
            # No aggregated table exists for the column, we need to aggregate it
            sc_agg_input_tables = sc_tables_basis.filter(aggregation=False, realization=True)

            # If we have a wildcard table name, we must ensure that we're down to a single table name in the search context
            if self._req_table_name is None:
                existing_agg_table_names = await sc_existing_agg_tables.names_async
                if len(existing_agg_table_names) > 1:
                    raise MultipleDataMatchesError(
                        f"Multiple tables found for {self._make_req_info_str()}", Service.SUMO
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
        """Fetches multiple columns async and aggregates them into a single Arrow table"""

        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(self.get_aggregated_single_column_async(column_name)) for column_name in column_names
            ]

        table_arr: list[pa.Table] = [task.result() for task in tasks]

        ret_table: pa.Table | None = None
        for column_table, column_name in zip(table_arr, column_names):
            if ret_table is None:
                ret_table = column_table
            else:
                ret_table = ret_table.append_column(column_name, column_table[column_name])

        return ret_table

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
