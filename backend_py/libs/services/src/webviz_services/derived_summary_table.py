from collections.abc import Awaitable
import io
import asyncio
import logging
from dataclasses import dataclass
from typing import Callable

import pyarrow as pa
import pyarrow.parquet as pq

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import InvalidDataError, Service
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client

from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.task_meta_tracker import TaskState, get_task_meta_tracker_for_user

from webviz_services.utils.sumo_blob_cache import SumoBlobCache


LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, kw_only=True)
class DerivedTableInfo:
    vector_names: list[str]
    source_obj_uuids: list[str]


@dataclass(frozen=True, kw_only=True)
class _TableItem:
    vec_name: str
    table: pa.Table
    obj_uuid: str


StatusCallback = Callable[[str], Awaitable[None]]

async def create_derived_summary_table_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str, table_name: str | None, vector_names: list[str], status_cb: StatusCallback) -> tuple[pa.Table, DerivedTableInfo]:

    sc_basis = SearchContext(sumo=sumo_client).tables.filter(
        uuid=case_uuid,
        ensemble=ensemble_name,
        name=table_name,
        content=["timeseries", "simulationtimeseries"],
    )

    # !!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!
    await asyncio.sleep(2)

    num_vecs = len(vector_names)
    table_arr: list[_TableItem] = []
    for i, vector_name in enumerate(vector_names):
        await status_cb(f"Getting summary vector {i + 1}/{num_vecs}: {vector_name}")
        sc_vec = sc_basis.filter(column=vector_name)
        vec_table_obj = await sc_vec.aggregation_async(column=vector_name, operation="collection")
        if not isinstance(vec_table_obj, Table):
            raise InvalidDataError("Did not get expected object type of Table for table aggregation", Service.SUMO)

        vec_table_pa = await vec_table_obj.to_arrow_async()
        table_arr.append(_TableItem(vec_name=vector_name, table=vec_table_pa, obj_uuid=vec_table_obj.uuid))

    await status_cb(f"Combining summary vector tables for {num_vecs} vectors")
    first_vec_name = table_arr[0].vec_name
    first_table = table_arr[0].table
    first_date_column = first_table.column("DATE")
    first_real_column = first_table.column("REAL")
    for i in range(1, len(table_arr)):
        vec_name = table_arr[i].vec_name
        src_table = table_arr[i].table
        real_column = src_table.column("REAL")
        date_column = src_table.column("DATE")
        if not first_date_column.equals(date_column):
            raise InvalidDataError(
                f"The DATE columns are not equal: DATE values in aggregated table for {first_vec_name} differ from aggregated table for {vec_name}.", Service.SUMO)
        if not first_real_column.equals(real_column):
            raise InvalidDataError(
                f"The REAL columns are not equal: REAL values in aggregated table for {first_vec_name} differ from aggregated table for {vec_name}.", Service.SUMO)

    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!
    if "FGIP" in vector_names:
        LOGGER.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        LOGGER.error("!!!!!!!!!!Injecting dummy error for vector to test error handling in derived table creation")
        LOGGER.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        raise InvalidDataError(f"DUMMY ERROR", Service.SUMO)


    # Now we can merge the tables by appending the "value" columns
    merged_table = first_table
    for i in range(1, len(table_arr)):
        vec_name = table_arr[i].vec_name
        src_table = table_arr[i].table
        merged_table = merged_table.append_column(src_table.field(vec_name), src_table.column(vec_name))

    info = DerivedTableInfo(
        vector_names=[holder.vec_name for holder in table_arr],
        source_obj_uuids=[holder.obj_uuid for holder in table_arr],
    )

    return merged_table, info



async def bgjob_create_and_store_derived_table_async(authenticated_user: AuthenticatedUser, task_id: str, case_uuid: str, ensemble_name: str, vector_names: list[str]) -> bool:
    perf_metrics = PerfMetrics()
    log_prefix = f"##BGJOB-{task_id}: "

    LOGGER.info(f"{log_prefix}Starting background job for creating derived summary table")

    task_tracker = get_task_meta_tracker_for_user(authenticated_user)
    initial_task_meta = await task_tracker.get_task_meta_async(task_id)
    #LOGGER.debug(f"{log_prefix}Fetched initial task meta: {initial_task_meta}")
    if initial_task_meta is None:
        LOGGER.error(f"{log_prefix}Task not found in tracker, aborting")
        return False

    cache_key = initial_task_meta.expected_store_key
    if not cache_key:
        LOGGER.error(f"{log_prefix}No cache_key (expected_store_key) found in task meta, cannot proceed")
        await task_tracker.set_state_async(task_id, TaskState.FAILED, status_message="Internal error: missing expected_store_key in task meta")
        return False

    await task_tracker.set_state_async(task_id, TaskState.RUNNING, status_message="Creating derived summary table")

    async def _update_status_msg(msg: str) -> None:
        LOGGER.info(f"{log_prefix} * {msg}")
        await task_tracker.set_status_message_async(task_id, status_message=msg)

    try:
        access_token = authenticated_user.get_sumo_access_token()
        sumo_client = create_sumo_client(access_token)
        perf_metrics.record_lap("init")

        derived_table, derived_table_info = await create_derived_summary_table_async(sumo_client, case_uuid, ensemble_name, None, vector_names, status_cb=_update_status_msg)
        perf_metrics.record_lap("create-table")

        task_tracker.set_status_message_async(task_id, status_message="Storing derived summary table")

        byte_stream = io.BytesIO()
        pq.write_table(derived_table, byte_stream, compression="zstd")
        byte_stream.seek(0)

        blob_cache = SumoBlobCache(sumo_client, "derivedVecTable")
        blob_size = byte_stream.getbuffer().nbytes
        blob_sas_url = await blob_cache.reserve_cache_entry_async(cache_key, source_obj_uuids=derived_table_info.source_obj_uuids, blob_size=blob_size)
        if not blob_sas_url:
            raise Exception("Failed to reserve cache entry for derived table blob")

        await blob_cache.upload_reserved_blob_async(blob_sas_url, byte_stream.getvalue())
        perf_metrics.record_lap("write_cache")

        await task_tracker.set_state_async(task_id, TaskState.SUCCEEDED, status_message="Derived summary table ready")
        LOGGER.info(f"{log_prefix}Finished creating and storing derived summary table in cache with key {cache_key}. Perf metrics: {perf_metrics.to_string()}")
        return True

    except Exception as e:
        LOGGER.error(f"{log_prefix}Failed to create derived summary table: {e}")
        await task_tracker.set_state_async(task_id, TaskState.FAILED, status_message=str(e))
        return False
