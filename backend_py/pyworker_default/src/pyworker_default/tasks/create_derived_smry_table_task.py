import io
import logging

from azure.servicebus import ServiceBusReceivedMessage
import pyarrow.parquet as pq

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.derived_smry_table.batch_aggregate import ensure_vectors_aggregated_async
from webviz_services.derived_smry_table.create_derived_table import create_derived_smry_table_async
from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client
from webviz_services.utils.sumo_blob_cache import SumoBlobCache
from webviz_services.utils.task_meta_tracker import TaskMetaTracker
from webviz_server_schemas.pyworker.messages import CreateDerivedSmryTableMsg

from ..task_exceptions import MalformedMessageError, TaskFailedError, TaskInternalError, TaskTrackingError
from ..task_runner import TaskSuccess
from ..utils.abort_signal import AbortSignal
from ..utils import message_decryption


_logger = logging.getLogger(__name__)


def _parse_and_decrypt_sb_message(sb_msg: ServiceBusReceivedMessage) -> tuple[CreateDerivedSmryTableMsg, str]:
    try:
        body_bytes = b"".join(sb_msg.body)
        msg = CreateDerivedSmryTableMsg.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to parse message: {repr(exc)}") from exc

    try:
        access_token = message_decryption.decrypt_data_to_str(msg.encrypted_access_token)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to decrypt access token: {repr(exc)}") from exc

    return msg, access_token


async def create_derived_smry_table_task_async(
    task_tracker: TaskMetaTracker, sb_msg: ServiceBusReceivedMessage, abort_signal: AbortSignal
) -> TaskSuccess:

    perf_metrics = PerfMetrics()

    _logger.info(f"Handling create-derived-smry-table message: {sb_msg.message_id=}, {sb_msg.sequence_number=}")

    msg, access_token = _parse_and_decrypt_sb_message(sb_msg)
    task_id = msg.task_id

    task_meta = await task_tracker.get_task_meta_async(task_id)
    if not task_meta:
        raise TaskTrackingError(f"Task meta for task_id {task_id} not found, cannot proceed with processing message")

    async def _update_status_msg_async(status_msg: str) -> None:
        _logger.debug(f"-- updating status message: {status_msg=}")
        await task_tracker.set_status_message_async(task_id, status_message=status_msg)

    cache_key = task_meta.expected_store_key
    if not cache_key:
        raise TaskTrackingError("Missing expected_store_key in task meta")

    sumo_client = create_sumo_client(access_token)
    perf_metrics.record_lap("init")

    await _update_status_msg_async("Creating derived summary table")

    try:
        await ensure_vectors_aggregated_async(sumo_client, msg.case_uuid, msg.ensemble_name, None, msg.vector_names, progress_cb=_update_status_msg_async)
    except ServiceLayerException as exc:
        raise TaskFailedError(f"Error aggregating vectors: {str(exc)}", internal_error_message=repr(exc)) from exc
    
    perf_metrics.record_lap("ensure-aggregated")
    abort_signal.raise_if_aborted()

    try:
        derived_table_pa, derived_table_info = await create_derived_smry_table_async(sumo_client, msg.case_uuid, msg.ensemble_name, None, msg.vector_names, progress_cb=_update_status_msg_async)
    except ServiceLayerException as exc:
        raise TaskFailedError(f"Failed to create derived table: {str(exc)}", internal_error_message=repr(exc)) from exc
    
    perf_metrics.record_lap("create-table")
    abort_signal.raise_if_aborted()

    await _update_status_msg_async("Storing derived summary table")

    byte_stream = io.BytesIO()
    pq.write_table(derived_table_pa, byte_stream, compression="zstd")
    byte_stream.seek(0)

    blob_cache = SumoBlobCache(sumo_client, SumoBlobCache.Namespace.DERIVED_VEC_TABLE)
    blob_size = byte_stream.getbuffer().nbytes
    blob_sas_url = await blob_cache.reserve_cache_entry_async(cache_key, source_obj_uuids=derived_table_info.source_obj_uuids, blob_size=blob_size)
    if not blob_sas_url:
        raise TaskInternalError("Failed to reserve cache entry for derived table blob")

    await blob_cache.upload_reserved_blob_async(blob_sas_url, byte_stream.getvalue())
    perf_metrics.record_lap("write_cache")

    _logger.info(f"Finished creating and storing derived summary table in cache with key {cache_key}. Perf metrics: {perf_metrics.to_string()}")
    return TaskSuccess("Derived summary table ready")




