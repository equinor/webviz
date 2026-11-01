import logging

from azure.servicebus import ServiceBusReceivedMessage

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_server_schemas.pyworker.messages import QcHydrostaticEquilGridPropertyCheckMsg
from webviz_services.operations.hydrostatic_equilibrium_check.hydrostatic_equilibrium_check import (
    HydrostaticEquilibriumCheck,
)
from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.sumo_access.grid3d_access import Grid3dAccess
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client
from webviz_services.utils.sumo_blob_cache import OP_QC_CHECKS, SumoBlobCacheError, get_sumo_blob_cache_from_sumo_client
from webviz_services.utils.task_meta_tracker import TaskMetaTracker

from ..task_exceptions import MalformedMessageError, TaskFailedError, TaskRetryError, TaskTrackingError
from ..task_runner import TaskSuccess
from ..utils import message_decryption
from ..utils.abort_signal import AbortSignal

_logger = logging.getLogger(__name__)


def _parse_and_decrypt_sb_message(
    sb_msg: ServiceBusReceivedMessage,
) -> tuple[QcHydrostaticEquilGridPropertyCheckMsg, str]:
    try:
        body_bytes = b"".join(sb_msg.body)
        msg = QcHydrostaticEquilGridPropertyCheckMsg.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to parse message: {repr(exc)}") from exc

    try:
        access_token = message_decryption.decrypt_data_to_str(msg.encrypted_access_token)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to decrypt access token: {repr(exc)}") from exc

    return msg, access_token


async def qc_hydrostatic_equil_grid_property_check_task_async(
    task_tracker: TaskMetaTracker, sb_msg: ServiceBusReceivedMessage, abort_signal: AbortSignal
) -> TaskSuccess:

    perf_metrics = PerfMetrics()

    _logger.info(
        f"Handling qc-hydrostatic-equil-grid-property-check message: {sb_msg.message_id=}, {sb_msg.sequence_number=}"
    )

    msg, access_token = _parse_and_decrypt_sb_message(sb_msg)
    task_id = msg.task_id

    task_meta = await task_tracker.get_task_meta_async(task_id)
    if not task_meta:
        raise TaskTrackingError(f"Task meta for task_id {task_id} not found, cannot proceed with processing message")

    cache_key = task_meta.expected_store_key
    if not cache_key:
        raise TaskTrackingError("Missing expected_store_key in task meta")

    sumo_client = create_sumo_client(access_token)
    check = HydrostaticEquilibriumCheck(
        ensemble_name=msg.ensemble_name,
        grid3d_access=Grid3dAccess(sumo_client, msg.case_uuid, msg.ensemble_name),
    )
    perf_metrics.record_lap("init")

    await task_tracker.set_status_message_async(
        task_id, status_msg=f"Checking hydrostatic equilibrium grid properties for realization {msg.realization}"
    )

    try:
        result = await check.compute_grid_property_check_async(grid_name=msg.grid_name, realization=msg.realization)
    except (ServiceLayerException, ValueError) as exc:
        raise TaskFailedError(
            f"Failed to compute grid property check: {str(exc)}", internal_error_msg=repr(exc)
        ) from exc

    perf_metrics.record_lap("check")
    abort_signal.raise_if_aborted()

    blob_cache = get_sumo_blob_cache_from_sumo_client(sumo_client, OP_QC_CHECKS)
    try:
        await blob_cache.put_pydantic_model_async(
            cache_key, source_obj_uuids=result.realization_result.source_object_uuids, model=result
        )
    except SumoBlobCacheError as exc:
        raise TaskRetryError(f"Failed to store grid property check result in cache: {str(exc)}") from exc
    perf_metrics.record_lap("write-cache")

    _logger.info(
        f"Finished hydrostatic equilibrium grid property check, stored with key {cache_key}. {perf_metrics.to_string()}"
    )
    return TaskSuccess("Hydrostatic equilibrium grid property check completed")
