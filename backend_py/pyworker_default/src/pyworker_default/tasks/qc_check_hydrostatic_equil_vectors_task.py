import logging

from azure.servicebus import ServiceBusReceivedMessage

from webviz_core_utils.perf_metrics import PerfMetrics

from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_check import HydrostaticEquilibriumCheck
from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_types import HydrostaticVectorCheckResult

from webviz_services.sumo_access.grid3d_access import Grid3dAccess
from webviz_services.sumo_access.summary_access import SummaryAccess
from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.utils.task_meta_tracker import TaskMetaTracker
from webviz_services.utils.sumo_blob_cache import SumoBlobCache
from webviz_services.utils.user_cache import get_user_cache_for_user_id
from webviz_server_schemas.pyworker.messages import QcCheckHydrostaticEquilVectorsMsg

from ..task_runner import TaskFailedError
from ..task_exceptions import MalformedMessageError, TaskTrackingError
from ..task_runner import TaskSuccess
from ..utils import message_decryption
from ..utils.abort_signal import AbortSignal


_logger = logging.getLogger(__name__)


def _parse_and_decrypt_sb_message(sb_msg: ServiceBusReceivedMessage) -> tuple[QcCheckHydrostaticEquilVectorsMsg, str]:
    try:
        body_bytes = b"".join(sb_msg.body)
        msg = QcCheckHydrostaticEquilVectorsMsg.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to parse message: {repr(exc)}") from exc

    try:
        access_token = message_decryption.decrypt_data_to_str(msg.encrypted_access_token)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to decrypt access token: {repr(exc)}") from exc

    return msg, access_token


async def qc_check_hydrostatic_equil_vectors_task_async(
    task_tracker: TaskMetaTracker, sb_msg: ServiceBusReceivedMessage, _abort_signal: AbortSignal
) -> TaskSuccess:

    perf_metrics = PerfMetrics()
    _logger.info(f"Running QC task to check hydrostatic equilibrium for vectors: {sb_msg.message_id=}, {sb_msg.sequence_number=}")

    msg, access_token = _parse_and_decrypt_sb_message(sb_msg)

    task_meta = await task_tracker.get_task_meta_async(msg.task_id)
    if not task_meta:
        raise TaskTrackingError(f"Task meta for task_id {msg.task_id} not found, cannot proceed with task")

    cache_key = task_meta.expected_store_key
    if not cache_key:
        raise TaskTrackingError("Missing expected_store_key in task meta")

    grid3d_access=Grid3dAccess.from_ensemble_name(access_token=access_token, case_uuid=msg.case_uuid, ensemble_name=msg.ensemble_name)
    summary_access=SummaryAccess.from_ensemble_name(access_token=access_token, case_uuid=msg.case_uuid, ensemble_name=msg.ensemble_name)

    perf_metrics.record_lap("init")

    check = HydrostaticEquilibriumCheck(
        ensemble_name=msg.ensemble_name,
        grid3d_access=grid3d_access,
        summary_access=summary_access,
    )

    try:
        result: HydrostaticVectorCheckResult = await check.compute_vector_check_async(t0_iso=msg.t0_iso_str, t1_iso=msg.t1_iso_str)
    except ServiceLayerException as exc:
        raise TaskFailedError(status_message=f"Failed to compute vectors check: {exc.message}", internal_error_message=repr(exc)) from exc
    perf_metrics.record_lap("check")

    # !!!!!!
    # !!!!!!
    # We don't have any source object uuids for this task, so we can't use the Sumo cache
    # Do a hack and communicate result using the user cache instead
    user_cache = get_user_cache_for_user_id(user_id=msg.user_id)
    await user_cache.put_pydantic_model_async(key=cache_key, model=result, ser_fmt="msgpack", ttl_s=3600)
    perf_metrics.record_lap("write_cache")

    _logger.info(f"Completed QC task to check hydrostatic equilibrium for vectors in: {perf_metrics.to_string()}")
    return TaskSuccess("Hydrostatic equilibrium QC check for vectors completed")
