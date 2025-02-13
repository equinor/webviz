import logging

import asyncio
import pyarrow as pa
from fmu.sumo.explorer.objects._search_context import SearchContext

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.service_exceptions import Service, NoDataError, MultipleDataMatchesError

LOGGER = logging.getLogger(__name__)


async def load_aggregated_arrow_table_single_column_from_sumo(
    ensemble_context: SearchContext,
    table_column_name: str,
    table_name: str | None = None,
    table_content_name: str | list[str] | None = None,
    table_tagname: str | None = None,
) -> pa.Table:
    """Filters an ensemble context for a single table and column, aggregates the column (if it does not already exist),
    and returns the result as an Arrow table"""
    timer = PerfMetrics()

    table_context = ensemble_context.filter(
        cls="table",
        tagname=table_tagname,
        content=table_content_name,
        column=table_column_name,
        name=table_name,
    )
    # Ensure uniqueness? Takes time
    agg = await table_context.aggregation_async(column=table_column_name, operation="collection")
    timer.record_lap("aggregation_async")
    LOGGER.debug(f"{timer.to_string()}, {table_content_name=}, {table_name=}, {table_column_name=}")

    return await agg.to_arrow_async()


async def load_aggregated_arrow_table_multiple_columns_from_sumo(
    ensemble_context: SearchContext,
    table_column_names: list[str],
    table_name: str | None = None,
    table_content_name: str | list[str] | None = None,
    table_tagname: str | None = None,
) -> pa.Table:
    """Fetches multiple columns async and aggregates them into a single Arrow table"""
    async with asyncio.TaskGroup() as tg:
        tasks = [
            tg.create_task(
                load_aggregated_arrow_table_single_column_from_sumo(
                    ensemble_context=ensemble_context,
                    table_content_name=table_content_name,
                    table_tagname=table_tagname,
                    table_name=table_name,
                    table_column_name=column_name,
                )
            )
            for column_name in table_column_names
        ]
    table_arr = [task.result() for task in tasks]

    table = None
    for column_table, column_name in zip(table_arr, table_column_names):
        if table is None:
            table = column_table
        else:
            table = table.append_column(column_name, column_table[column_name])
    return table


async def load_single_realization_arrow_table(
    ensemble_context: SearchContext,
    realization_no: int,
    table_content_name: str,
    table_name: str | None = None,
    table_column_names: list[str] | None = None,
) -> pa.Table:
    """Get a pyarrow table for a given realization and context"""
    timer = PerfMetrics()

    table_context = ensemble_context.tables.filter(
        content=table_content_name,
        name=table_name,
        realization=realization_no,
    )
    no_of_tables = await table_context.length_async()
    names = await table_context.names_async
    print(names)
    if no_of_tables == 0:
        raise NoDataError(
            f"No tables found in {table_content_name=}, {table_name=}",
            Service.SUMO,
        )
    if no_of_tables > 1:
        raise MultipleDataMatchesError(
            f"Multiple tables found in {table_content_name=}, {table_name=}",
            Service.SUMO,
        )
    sumo_table = await table_context.getitem_async(0)
    timer.record_lap("getitem_async")
    table = await sumo_table.to_arrow_async()
    timer.record_lap("to_arrow_async")

    LOGGER.debug(f"{timer.to_string()}, {table_content_name=}, {table_name=}")
    if table_column_names is not None:
        return table.select(table_column_names)
    return table
