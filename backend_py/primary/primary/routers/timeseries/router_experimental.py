import asyncio
import logging
import hashlib
import time
from typing import Annotated

import pyarrow as pa
import pyarrow.parquet as pq
import fsspec
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from azure.servicebus import ServiceBusMessage
from cryptography.fernet import Fernet

from webviz_core_utils.background_tasks import run_in_background_task
from webviz_server_schemas.pyworker.messages import WorkerOperation
from webviz_server_schemas.pyworker.messages import CreateCombinedVectorTableMsg
from webviz_services.platform.message_bus import MessageBusSingleton, MessageBus
from webviz_services.utils.task_meta_tracker import get_task_meta_tracker_for_user_id
from webviz_services.utils.task_meta_tracker import TaskState
from webviz_services.utils.sumo_blob_cache import OP_COMBINED_VECTOR_TABLE
from webviz_services.utils.sumo_blob_cache import get_sumo_blob_cache_from_access_token, SumoBlobCache
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.operations.combined_vector_table.bgjob_dev_create_combined_table import bgjob_dev_create_combined_table_async
from webviz_services.platform.message_bus import MessageBusSingleton, MessageBus

from primary import config
from primary.auth.auth_helper import AuthHelper
from primary.auth.auth_helper import AuthenticatedUser
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from .._shared.long_running_operations import LroInProgressResp, LroFailureResp, LroSuccessResp, LroCommandResp

LOGGER = logging.getLogger(__name__)

router = APIRouter()


class CombinedTableResponse(BaseModel):
    table_handle: str
    dbg_info: str | None

@router.get("/combined_vector_table_hybrid", include_in_schema=True)
async def get_combined_vector_table_hybrid(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    vector_names: Annotated[list[str], Query(description="List of vector names to include in the combined table")],
    retry_creation_task: Annotated[bool | None, Query(description="Can be used to retry the table creation task")] = None,
    # fmt:on
) -> LroSuccessResp[CombinedTableResponse] | LroInProgressResp | LroFailureResp | LroCommandResp:
    perf_metrics = ResponsePerfMetrics(response)
    dbg_prefix = "!!!!!!!!!! "
    LOGGER.debug(f"{dbg_prefix}Received request for combined vector table with: {case_uuid=} {ensemble_name=} {retry_creation_task=} {vector_names=}")

    # Create the deterministic table handle (also includes ensemble fingerprint)
    table_handle = await _compute_table_handle_async(authenticated_user, case_uuid, ensemble_name, vector_names)
    LOGGER.debug(f"{dbg_prefix}Table handle will be: {table_handle=}")

    user_id = authenticated_user.get_user_id()

    task_tracker = get_task_meta_tracker_for_user_id(user_id)
    task_fp = f"taskFP__{table_handle}"

    if retry_creation_task:
        LOGGER.info(f"{dbg_prefix}Retry creation task flag is set to true, trying to delete existing task with {task_fp=}")
        if await task_tracker.delete_task_by_fingerprint_async(task_fp):
            LOGGER.info(f"{dbg_prefix}Existing task was deleted {task_fp=}")
        else:
            LOGGER.info(f"{dbg_prefix}Tried to delete existing task, but no existing task found with {task_fp=}")

        return LroCommandResp(command_ok=True)

    sumo_access_token = authenticated_user.get_sumo_access_token()
    blob_cache: SumoBlobCache = get_sumo_blob_cache_from_access_token(sumo_access_token, OP_COMBINED_VECTOR_TABLE)
    cache_key = blob_cache.compute_cache_key(table_handle)

    perf_metrics.record_lap("init")

    # Note that we always check in the cache first!
    # This means that once a table is created and is in cache, we will always return it and not trigger any
    # more tasks, even if the client keeps retrying with the retry_creation_task flag set to true.
    # The retry_creation_task flag is really only for retrying when there is no cache entry yet.
    has_cache_entry = await blob_cache.has_cache_entry_async(cache_key)
    perf_metrics.record_lap("check-cache")
    if has_cache_entry:
        # Since the table is already in cache, we can delete any existing task mapping, since it is no longer needed.
        # If at some point in the future the table is pruned from the cache, we would like to create a new task anyway.
        await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)

        LOGGER.info(f"{dbg_prefix}Returning handle to combined table found in cache, timing: {perf_metrics.to_string()} [{table_handle=}, {cache_key=}]")
        return LroSuccessResp(result=CombinedTableResponse(table_handle=table_handle, dbg_info="Got from cache"))

    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    perf_metrics.record_lap("task-meta")

    new_task_was_submitted = False
    if not task_meta:
        fernet = Fernet(config.SERVICE_BUS_PAYLOAD_FERNET_KEY)
        encrypted_access_token = fernet.encrypt(sumo_access_token.encode())

        # !!!!!!!!!!!!!!!!!!!
        # Introduce error for testing purposes
        # if "FGIR" in vector_names:
        #     encrypted_access_token = b"ILLEGAL VALUE FOR FGIR"

        task_id = task_tracker.generate_task_id("dvt")

        msg = CreateCombinedVectorTableMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            vector_names=vector_names,
            encrypted_access_token=encrypted_access_token,
        )

        task_meta = await task_tracker.register_task_with_fingerprint_async(
            task_id=task_id,
            fingerprint=task_fp,
            ttl_s=5 * 60,
            expected_store_key=cache_key)

        # job_coro = bgjob_dev_create_combined_table_async(
        #     user_id=user_id,
        #     task_id=task_id,
        #     sumo_access_token=sumo_access_token,
        #     case_uuid=case_uuid,
        #     ensemble_name=ensemble_name,
        #     vector_names=vector_names
        # )
        # run_in_background_task(job_coro)

        message_bus: MessageBus = MessageBusSingleton.get_instance()
        sb_msg = ServiceBusMessage(subject=WorkerOperation.CREATE_COMBINED_VECTOR_TABLE, body=msg.model_dump_json())
        await message_bus.send_to_queue_async(queue_name=config.SERVICE_BUS_DEFAULT_QUEUE, message=sb_msg)

        new_task_was_submitted = True
        LOGGER.info(f"{dbg_prefix}Submitted new task to create combined table [{table_handle=}, {task_meta.task_id=}]")
        perf_metrics.record_lap("start-task")

    if task_meta.state == TaskState.SUCCEEDED:
        if not await blob_cache.has_cache_entry_async(cache_key):
            # This should not happen, if the task succeeded the blob should be in cache. But just in case, we can return an error here.
            await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
            LOGGER.error(f"{dbg_prefix}Table creation task succeeded but could not find result in cache [{table_handle=}, {task_meta.task_id=}, {cache_key=}]")
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            return LroFailureResp(error_message="Task succeeded but could not find result in cache")

        LOGGER.info(f"{dbg_prefix}Table creation task succeeded, timing {perf_metrics.to_string()} [{table_handle=}, {task_meta.task_id=}]")
        return LroSuccessResp(result=CombinedTableResponse(table_handle=table_handle, dbg_info="Task succeeded"))

    if task_meta.state in [TaskState.FAILED, TaskState.CANCELLED]:
        LOGGER.error(f"{dbg_prefix}Table creation task failed, msg: {task_meta.status_message} [{table_handle=}, {task_meta.task_id=}]")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return LroFailureResp(error_message=f"Task {task_meta.state}, msg: {task_meta.status_message}")

    LOGGER.info(f"{dbg_prefix}Returning in-progress for table handle, timing: {perf_metrics.to_string()} [{table_handle=}, {task_meta.task_id=}]")

    if new_task_was_submitted:
        prog_msg = f"New task submitted: {task_meta.state}"
    else:
        status_text = f" - {task_meta.status_message}" if task_meta.status_message else ""
        elapsed_task_time_s = time.time() - task_meta.registered_at_utc_s
        prog_msg = f"Task {task_meta.state}{status_text} ({elapsed_task_time_s:.1f}s elapsed)"

    response.status_code = status.HTTP_202_ACCEPTED

    LOGGER.info(f"{dbg_prefix}Actual returning: {new_task_was_submitted=}, {retry_creation_task=}, timing: {perf_metrics.to_string()} [{table_handle=}, {task_meta.task_id=}]")

    return LroInProgressResp(status_str=task_meta.state, task_id=task_meta.task_id, progress_message=prog_msg)



class CombinedTableInfo(BaseModel):
    vector_names: list[str]
    row_count: int
    byte_size: int | None
    dbg_info: str | None

@router.get("/combined_table_info")
async def get_combined_table_info(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    table_handle: Annotated[str, Query(description="Handle for the combined table")],
    # fmt:on
) -> CombinedTableInfo:
    perf_metrics = ResponsePerfMetrics(response)
    dbg_prefix = "info!!!!!! "
    LOGGER.debug(f"{dbg_prefix}Received request for combined table info: {table_handle=}")

    sumo_access_token = authenticated_user.get_sumo_access_token()
    blob_cache: SumoBlobCache = get_sumo_blob_cache_from_access_token(sumo_access_token, OP_COMBINED_VECTOR_TABLE)
    cache_key = blob_cache.compute_cache_key(table_handle)
    perf_metrics.record_lap("init")

    blob_sas_url = await blob_cache.resolve_cache_entry_async(cache_key)
    if not blob_sas_url:
        raise HTTPException(status_code=410, detail="Combined table not found in cache")
    perf_metrics.record_lap("resolve-cache")

    # Read only the Parquet footer via HTTP range requests — avoids downloading the full blob
    def _read_parquet_footer() -> tuple[list[str], int, int | None]:
        with fsspec.open(blob_sas_url, "rb") as f:
            pq_file = pq.ParquetFile(f)
            col_names: list[str] = pq_file.schema_arrow.names
            num_rows: int = pq_file.metadata.num_rows
            blob_size: int | None = getattr(f, "size", None)
        return col_names, num_rows, blob_size

    vector_names, row_count, blob_size_bytes = await asyncio.to_thread(_read_parquet_footer)
    perf_metrics.record_lap("read-footer")

    LOGGER.debug(f"{dbg_prefix}Vector names from footer: {vector_names}")

    table_blob_bytes = await blob_cache.download_resolved_blob_async(blob_sas_url)
    perf_metrics.record_lap("download-blob")
    if not table_blob_bytes:
        raise HTTPException(status_code=410, detail="Could not download combined table from blob storage")

    pq_table = pq.read_table(pa.BufferReader(table_blob_bytes))
    # LOGGER.debug(f"{dbg_prefix}Read table from blob cache, got schema:\n{pq_table.schema}")
    perf_metrics.record_lap("read-table")

    vector_names = pq_table.schema.names
    LOGGER.debug(f"{dbg_prefix}Vector names: {vector_names}")

    row_count = pq_table.num_rows
    blob_size_bytes = len(table_blob_bytes)
    LOGGER.debug(f"{dbg_prefix}Sizes: {row_count=}, {blob_size_bytes=}")

    LOGGER.info(f"{dbg_prefix}Got info on combined table, timing: {perf_metrics.to_string()} ({table_handle=})")
    return CombinedTableInfo(vector_names=vector_names, row_count=row_count, byte_size=blob_size_bytes, dbg_info=f"Timing: {perf_metrics.to_string()}")


@router.get("/calc_something_on_combined_table")
async def get_calc_something_on_combined_table(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    table_handle: Annotated[str, Query(description="Handle to the combined table to do some calculation on")],
    calculation_params: Annotated[str, Query(description="Some parameter for the calculation")],
    # fmt:on
) -> str:
    perf_metrics = ResponsePerfMetrics(response)

    sumo_access_token = authenticated_user.get_sumo_access_token()
    blob_cache: SumoBlobCache = get_sumo_blob_cache_from_access_token(sumo_access_token, OP_COMBINED_VECTOR_TABLE)
    cache_key = blob_cache.compute_cache_key(table_handle)
    perf_metrics.record_lap("init")

    table_blob = await blob_cache.get_bytes_async(cache_key)
    perf_metrics.record_lap("get-from-cache")
    if not table_blob:
        raise HTTPException(status_code=410, detail="Combined table not found in cache")

    pq_table = pq.read_table(pa.BufferReader(table_blob))

    LOGGER.info(f"Did calculation on combined table blob from cache, timing: {perf_metrics.to_string()} ({table_handle=}, {calculation_params=})")
    return f"Did some calculation on combined table, timing: {perf_metrics.to_string()} ({table_handle=}, {calculation_params=})"


async def _compute_table_handle_async(authenticated_user: AuthenticatedUser, case_uuid: str, ensemble_name: str, vector_names: list[str]) -> str:
    sorted_vector_names_str = ",".join(sorted(vector_names))
    task_params_as_str = f"{case_uuid}:{ensemble_name}:{sorted_vector_names_str}"

    sumo_fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)
    ensemble_fp = await sumo_fingerprinter.get_or_calc_ensemble_fp_async(case_uuid, ensemble_name)

    # 8 bytes = 16 hex chars = 64 bits should be enough to avoid collisions for our use case
    task_fp = hashlib.shake_128((ensemble_fp + task_params_as_str).encode()).hexdigest(8)
    return f"TH__{task_fp}"


