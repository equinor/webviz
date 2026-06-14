import io
import logging

import pyarrow.parquet as pq

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.task_meta_tracker import TaskState, get_task_meta_tracker_for_user
from webviz_services.utils.sumo_blob_cache import SumoBlobCache

from .create_derived_table import create_derived_smry_table_async
from .batch_aggregate import ensure_vectors_aggregated_async

LOGGER = logging.getLogger(__name__)


async def bgjob_create_and_store_derived_table_async(authenticated_user: AuthenticatedUser, task_id: str, case_uuid: str, ensemble_name: str, vector_names: list[str]) -> bool:
    perf_metrics = PerfMetrics()
    log_prefix = f"##BGJOB-{task_id}: "

    LOGGER.info(f"{log_prefix}Starting background job for creating derived summary table")

    task_tracker = get_task_meta_tracker_for_user(authenticated_user)
    initial_task_meta = await task_tracker.get_task_meta_async(task_id)
    if initial_task_meta is None:
        LOGGER.error(f"{log_prefix}Task not found in tracker, aborting")
        return False

    cache_key = initial_task_meta.expected_store_key
    if not cache_key:
        LOGGER.error(f"{log_prefix}No cache_key (expected_store_key) found in task meta, cannot proceed")
        await task_tracker.set_state_async(task_id, TaskState.FAILED, status_message="Internal error: missing expected_store_key in task meta")
        return False

    await task_tracker.set_state_async(task_id, TaskState.RUNNING, status_message="Creating derived summary table")

    async def _update_status_msg_async(msg: str) -> None:
        LOGGER.info(f"{log_prefix} * {msg}")
        await task_tracker.set_status_message_async(task_id, status_message=msg)

    try:
        access_token = authenticated_user.get_sumo_access_token()
        sumo_client = create_sumo_client(access_token)
        perf_metrics.record_lap("init")

        await ensure_vectors_aggregated_async(sumo_client, case_uuid, ensemble_name, None, vector_names, progress_cb=_update_status_msg_async)
        perf_metrics.record_lap("ensure-aggregated")

        derived_table_pa, derived_table_info = await create_derived_smry_table_async(sumo_client, case_uuid, ensemble_name, None, vector_names, progress_cb=_update_status_msg_async)
        perf_metrics.record_lap("create-table")

        task_tracker.set_status_message_async(task_id, status_message="Storing derived summary table")

        byte_stream = io.BytesIO()
        pq.write_table(derived_table_pa, byte_stream, compression="zstd")
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
        raise
