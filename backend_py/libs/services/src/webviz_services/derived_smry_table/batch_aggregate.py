import asyncio
import logging
from collections.abc import Awaitable
from typing import Callable
from dataclasses import dataclass

import httpx

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import Service, ServiceRequestError, ServiceTimeoutError


LOGGER = logging.getLogger(__name__)


ProgressMsgCallback = Callable[[str], Awaitable[None]]

async def ensure_vectors_aggregated_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str, table_name: str | None, vector_names: list[str], progress_cb: ProgressMsgCallback) -> bool:

    #vectors_to_aggregate = vector_names

    vectors_to_aggregate = await _find_columns_needing_aggregation_async(sumo_client, case_uuid, ensemble_name, vector_names)
    if not vectors_to_aggregate:
        LOGGER.debug("ensure_vectors_aggregated_async() - No vectors needed aggregation")
        return True

    LOGGER.debug(f"ensure_vectors_aggregated_async() - Vectors needing aggregation: {vectors_to_aggregate}")

    vec_count = len(vectors_to_aggregate)
    sumo_status_holder = _SumoTaskStatusHolder(status="not started")
    agg_task = asyncio.create_task(_batch_aggregate_vectors_async(sumo_client, case_uuid, ensemble_name, vectors_to_aggregate, sumo_status_holder))

    try:
        last_reported_status_msg = None
        while not agg_task.done():
            status_msg = f"Batch aggregating {vec_count} vectors in Sumo: {sumo_status_holder.status}"
            if status_msg != last_reported_status_msg:
                await progress_cb(status_msg)
                last_reported_status_msg = status_msg

            await asyncio.sleep(0.2)

        # Must still await the task to get the result or re-raise any exception from doWork()
        agg_ok = await agg_task
        return agg_ok
    finally:
        if not agg_task.done():
            agg_task.cancel()


async def _find_columns_needing_aggregation_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str, column_names: list[str]) -> list[str]:
    if not column_names:
        return []

    sc_base = SearchContext(sumo=sumo_client).tables.filter(
        uuid=case_uuid,
        ensemble=ensemble_name,
        content=["timeseries", "simulationtimeseries"]
    )

    unique_column_names = list(dict.fromkeys(column_names))

    # Even if we specify the column names we're interested in here, we end up getting columns such as DATE and REAL back here
    sc_already_agg = sc_base.filter(column=unique_column_names, aggregation="collection", realization=False)
    raw_agg_cols_in_sumo: set[str] = set(await sc_already_agg.columns_async)

    validation_tasks: dict[str, asyncio.Task] = {}
    async with asyncio.TaskGroup() as tg:
        for col_name in unique_column_names:
            if col_name in raw_agg_cols_in_sumo:
                validation_tasks[col_name] = tg.create_task(_is_column_agg_valid(col_name, sc_base))

    cols_with_valid_agg: set[str] = set()
    for col_name, task in validation_tasks.items():
        if task.result():
            cols_with_valid_agg.add(col_name)

    cols_needing_agg: list[str] = []
    for col_name in unique_column_names:
        if col_name not in cols_with_valid_agg:
            cols_needing_agg.append(col_name)

    LOGGER.info(f"!!!!!!!!!!Requested columns:     {set(column_names)}")
    LOGGER.info(f"!!!!!!!!!!Existing aggregations: {cols_with_valid_agg}")
    LOGGER.info(f"!!!!!!!!!!Needing aggregation:   {cols_needing_agg}")

    return cols_needing_agg


async def _is_column_agg_valid(column_name: str, sc_base: SearchContext) -> bool:
    sc_agg_table = sc_base.filter(column=column_name, aggregation="collection", realization=False)

    num_agg_tables = await sc_agg_table.length_async()
    if num_agg_tables != 1:
        return False

    agg_table_obj: Table = await sc_agg_table.getitem_async(0)
    agg_ts = agg_table_obj.metadata["_sumo"]["timestamp"]

    sc_real_tables = sc_base.filter(realization=True, aggregation=False)
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
    if set(real_ids_older_than_agg) != set(agg_table_obj.metadata["fmu"]["aggregation"]["realization_ids"]):
        return False

    return True


@dataclass
class _SumoTaskStatusHolder:
    status: str

async def _batch_aggregate_vectors_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str, vector_names: list[str], task_status_holder: _SumoTaskStatusHolder) -> bool:
    perf_metrics = PerfMetrics()

    vec_count = len(vector_names)
    LOGGER.debug(f"_batch_aggregate_vectors_async() - Starting batch aggregate of {vec_count} vectors")

    sc_base = SearchContext(sumo=sumo_client).tables.filter(
            uuid=case_uuid,
            ensemble=ensemble_name,
            content=["timeseries", "simulationtimeseries"],
        )
    sc_real = sc_base.filter(realization=True, aggregation=False)

    try:
        httpx_resp = await sc_real.batch_aggregate_async(columns=vector_names, operation="collection", no_wait=True)
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.HTTPStatusError) as exc:
        if _should_treat_httpx_exception_as_timeout(exc):
            raise ServiceTimeoutError("Submitting task to Sumo aggregation service timed out", Service.SUMO) from exc
        raise ServiceRequestError("Error starting Sumo aggregation task", Service.SUMO) from exc

    perf_metrics.record_lap("submit-task")
    LOGGER.debug(f"_batch_aggregate_vectors_async() - Task submitted to Sumo aggregation service")

    # When we call aggregate_async() with no_wait=True, we expect the raw httpx.Response object
    # from the underlying POST request to be returned.
    if not isinstance(httpx_resp, httpx.Response):
        raise TypeError("Unexpected response type from Sumo when submitting statistical surface job")

    # The full pull location typically looks something like this:
    #   https://main-sumo-prod.radix.equinor.com/api/v1/tasks('3de7a932-14de-4873-8389-fe3a83213638')/result
    full_poll_location = httpx_resp.headers.get("location")
    if not full_poll_location.startswith(sumo_client.base_url):
        raise ServiceRequestError(f"Unexpected location header from Sumo: {full_poll_location}", Service.SUMO)

    # We'll be using the sumo client to do the polling and it expects the poll path to be relative to its base_url,
    # Also, try and strip the "/result" part from the poll location to get richer status information
    poll_path = full_poll_location[len(sumo_client.base_url) :]
    poll_path = poll_path.replace("/result", "")

    LOGGER.debug(f"_batch_aggregate_vectors_async() - Start polling for task result on: {poll_path}")

    poll_count = 0
    while True:
        poll_resp = await sumo_client.get_async(poll_path)
        poll_count += 1

        poll_resp_dict = poll_resp.json()
        #LOGGER.debug(f"_batch_aggregate_vectors_async() - !!!!!!!!!!POLL RESULT({poll_count}) {poll_resp_dict=}")

        status_str = poll_resp_dict["_source"]["status"]
        LOGGER.debug(f"_batch_aggregate_vectors_async() - Polling result for task on: {poll_path}, status: {status_str}")
        task_status_holder.status = status_str

        if status_str in ["succeeded", "failed"]:
            break

        await asyncio.sleep(1.0)

    perf_metrics.record_lap("polling")

    LOGGER.debug(f"_batch_aggregate_vectors_async() - Finished batch aggregate with {status_str=} in: {perf_metrics.to_string_s()}")

    if status_str == "succeeded":
        return True

    return False


def _should_treat_httpx_exception_as_timeout(httpx_exception: httpx.HTTPError) -> bool:
    """
    Return True if the given httpx exception should be treated as an upstream timeout.

    Covers:
      * client-side timeouts: httpx.ConnectTimeout, httpx.ReadTimeout
      * server-side timeout response: httpx.HTTPStatusError with status 504 Gateway Timeout

    Note that for server-side timeouts to work, httpx.raise_for_status() must have been called on the response.
    """
    if isinstance(httpx_exception, (httpx.ConnectTimeout, httpx.ReadTimeout)):
        return True

    if isinstance(httpx_exception, httpx.HTTPStatusError) and httpx_exception.response is not None:
        return httpx_exception.response.status_code == 504

    return False


