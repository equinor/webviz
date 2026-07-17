import logging

from azure.servicebus import ServiceBusReceivedMessage

from webviz_core_utils.perf_metrics import PerfMetrics

from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_check import HydrostaticEquilibriumCheck
from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_types import HydrostaticGridCheckRealizationResult

from webviz_services.sumo_access.grid3d_access import Grid3dAccess
from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.utils.sumo_blob_cache import SumoBlobCache
from webviz_services.utils.task_meta_tracker import TaskMetaTracker
from webviz_server_schemas.pyworker.messages import QcHydrostaticEquilGridPropertiesMsg

from ..task_runner import TaskFailedError
from ..task_exceptions import MalformedMessageError, TaskTrackingError
from ..task_runner import TaskSuccess
from ..utils import message_decryption
from ..utils.abort_signal import AbortSignal


_logger = logging.getLogger(__name__)


def _parse_and_decrypt_sb_message(sb_msg: ServiceBusReceivedMessage) -> tuple[QcHydrostaticEquilGridPropertiesMsg, str]:
    try:
        body_bytes = b"".join(sb_msg.body)
        msg = QcHydrostaticEquilGridPropertiesMsg.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to parse message: {repr(exc)}") from exc

    try:
        access_token = message_decryption.decrypt_data_to_str(msg.encrypted_access_token)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to decrypt access token: {repr(exc)}") from exc

    return msg, access_token


async def qc_check_hydrostatic_equil_grid_properties_task_async(
    task_tracker: TaskMetaTracker, sb_msg: ServiceBusReceivedMessage, _abort_signal: AbortSignal
) -> TaskSuccess:

    perf_metrics = PerfMetrics()
    _logger.info(f"Running QC task to check hydrostatic equilibrium for grid properties: {sb_msg.message_id=}, {sb_msg.sequence_number=}")

    msg, access_token = _parse_and_decrypt_sb_message(sb_msg)

    task_meta = await task_tracker.get_task_meta_async(msg.task_id)
    if not task_meta:
        raise TaskTrackingError(f"Task meta for task_id {msg.task_id} not found, cannot proceed with task")

    cache_key = task_meta.expected_store_key
    if not cache_key:
        raise TaskTrackingError("Missing expected_store_key in task meta")

    grid3d_access=Grid3dAccess.from_ensemble_name(access_token=access_token, case_uuid=msg.case_uuid, ensemble_name=msg.ensemble_name)
    check = HydrostaticEquilibriumCheck(ensemble_name=msg.ensemble_name, grid3d_access=grid3d_access)

    perf_metrics.record_lap("init")

    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # INTENTIONAL FAILURE
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    if msg.realization % 5 == 0:
        _logger.error(f"INTENTIONAL FAILURE for testing: QC task to check hydrostatic equilibrium for grid properties failed for realization {msg.realization}")
        raise TaskFailedError(status_message=f"INTENTIONAL FAILURE for testing")

    try:
        result: HydrostaticGridCheckRealizationResult = await check.compute_grid_property_check_async(grid_name=msg.grid_name, realization=msg.realization)
    except ServiceLayerException as exc:
        raise TaskFailedError(status_message=f"Failed to compute grid property check: {exc.message}", internal_error_message=repr(exc)) from exc
    perf_metrics.record_lap("check")

    blob_cache = SumoBlobCache.from_access_token(access_token, SumoBlobCache.Namespace.QC_CHECKS)
    await blob_cache.put_pydantic_model_async(cache_key=cache_key, source_obj_uuids=result.realization_result.source_object_uuids, model=result)
    perf_metrics.record_lap("write_cache")

    _logger.info(f"Completed QC task to check hydrostatic equilibrium for grid properties in: {perf_metrics.to_string()}")
    return TaskSuccess("Hydrostatic equilibrium QC check for grid properties completed")
