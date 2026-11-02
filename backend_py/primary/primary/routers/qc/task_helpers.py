import hashlib
import json
import logging
import time
from typing import Callable, TypeVar

from azure.servicebus import ServiceBusMessage
from cryptography.fernet import Fernet
from fastapi import Response, status
from pydantic import BaseModel

from webviz_server_schemas.pyworker.messages import WorkerOperation
from webviz_services.platform.message_bus import MessageBus, MessageBusSingleton
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.utils.sumo_blob_cache import OP_QC_CHECKS, get_sumo_blob_cache_from_access_token
from webviz_services.utils.task_meta_tracker import TaskState, get_task_meta_tracker_for_user_id

from primary import config
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from .._shared.long_running_operations import LroCommandResp, LroFailureResp, LroInProgressResp, LroSuccessResp

LOGGER = logging.getLogger(__name__)

ServiceResultT = TypeVar("ServiceResultT", bound=BaseModel)
ApiResultT = TypeVar("ApiResultT")


async def compute_qc_task_fingerprint_async(
    authenticated_user: AuthenticatedUser, case_uuid: str, ensemble_name: str, op_name: str, params: dict
) -> str:
    # Include the ensemble fingerprint so that the task fingerprint changes when the underlying data changes
    sumo_fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)
    ensemble_fp = await sumo_fingerprinter.get_or_calc_ensemble_fp_async(case_uuid, ensemble_name)

    all_params = {"op": op_name, "case_uuid": case_uuid, "ensemble_name": ensemble_name, **params}
    params_str = json.dumps(all_params, sort_keys=True)

    # 8 bytes = 16 hex chars = 64 bits should be enough to avoid collisions for our use case
    task_fp = hashlib.shake_128((ensemble_fp + params_str).encode()).hexdigest(8)
    return f"taskFP__{op_name}__{task_fp}"


# pylint: disable-next=too-many-locals, too-many-arguments, too-many-statements
async def run_hybrid_qc_task_async(
    *,
    response: Response,
    authenticated_user: AuthenticatedUser,
    task_fp: str,
    result_model: type[ServiceResultT],
    to_api_result: Callable[[ServiceResultT], ApiResultT],
    make_msg: Callable[[str, bytes], BaseModel],
    worker_op: WorkerOperation,
    retry_task: bool | None,
    perf_metrics: ResponsePerfMetrics,
) -> LroSuccessResp[ApiResultT] | LroInProgressResp | LroFailureResp | LroCommandResp:
    """Shared hybrid long-running flow: return cached result, or submit/track a pyworker task that computes it.

    `make_msg` receives (task_id, encrypted_access_token) and builds the worker message.
    """
    user_id = authenticated_user.get_user_id()
    task_tracker = get_task_meta_tracker_for_user_id(user_id)

    if retry_task:
        if await task_tracker.delete_task_by_fingerprint_async(task_fp):
            LOGGER.info(f"Existing QC task was deleted for retry [{task_fp=}]")
        else:
            LOGGER.info(f"Retry requested, but no existing QC task found [{task_fp=}]")
        return LroCommandResp(command_ok=True)

    sumo_access_token = authenticated_user.get_sumo_access_token()
    blob_cache = get_sumo_blob_cache_from_access_token(sumo_access_token, OP_QC_CHECKS)
    cache_key = blob_cache.compute_cache_key(task_fp)
    perf_metrics.record_lap("init")

    # Always check the cache first, so a cached result is returned even if the client sets retry_task
    if await blob_cache.has_cache_entry_async(cache_key):
        await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
        cached_result = await blob_cache.get_pydantic_model_async(cache_key, result_model)
        if cached_result is not None:
            LOGGER.info(f"Returning QC result from cache, timing: {perf_metrics.to_string()} [{task_fp=}]")
            return LroSuccessResp(result=to_api_result(cached_result))
        LOGGER.warning(f"QC cache entry exists but could not be read, continuing with task flow [{task_fp=}]")

    perf_metrics.record_lap("check-cache")

    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    perf_metrics.record_lap("task-meta")

    new_task_was_submitted = False
    if not task_meta:
        fernet = Fernet(config.SERVICE_BUS_PAYLOAD_FERNET_KEY)
        encrypted_access_token = fernet.encrypt(sumo_access_token.encode())

        task_id = task_tracker.generate_task_id("qc")
        msg = make_msg(task_id, encrypted_access_token)

        task_meta = await task_tracker.register_task_with_fingerprint_async(
            task_id=task_id, fingerprint=task_fp, ttl_s=5 * 60, expected_store_key=cache_key
        )

        message_bus: MessageBus = MessageBusSingleton.get_instance()
        sb_msg = ServiceBusMessage(subject=worker_op, body=msg.model_dump_json())
        await message_bus.send_to_queue_async(queue_name=config.SERVICE_BUS_DEFAULT_QUEUE, message=sb_msg)

        new_task_was_submitted = True
        LOGGER.info(f"Submitted new QC task [{worker_op=}, {task_meta.task_id=}]")
        perf_metrics.record_lap("start-task")

    if task_meta.state == TaskState.SUCCEEDED:
        task_result = await blob_cache.get_pydantic_model_async(cache_key, result_model)
        if task_result is None:
            # If the task succeeded the result should be in cache, but be defensive
            await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
            LOGGER.error(f"QC task succeeded but could not find result in cache [{task_meta.task_id=}, {cache_key=}]")
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            return LroFailureResp(
                task_id=task_meta.task_id, error_message="Task succeeded but could not find result in cache"
            )

        LOGGER.info(f"QC task succeeded, timing: {perf_metrics.to_string()} [{task_meta.task_id=}]")
        return LroSuccessResp(result=to_api_result(task_result))

    if task_meta.state in [TaskState.FAILED, TaskState.CANCELLED]:
        LOGGER.error(f"QC task failed, msg: {task_meta.status_message} [{task_meta.task_id=}]")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return LroFailureResp(
            task_id=task_meta.task_id, error_message=f"Task {task_meta.state}, msg: {task_meta.status_message}"
        )

    if new_task_was_submitted:
        prog_msg = f"New task submitted: {task_meta.state}"
    else:
        status_text = f" - {task_meta.status_message}" if task_meta.status_message else ""
        elapsed_task_time_s = time.time() - task_meta.registered_at_utc_s
        prog_msg = f"Task {task_meta.state}{status_text} ({elapsed_task_time_s:.1f}s elapsed)"

    LOGGER.debug(f"Returning in-progress for QC task, timing: {perf_metrics.to_string()} [{task_meta.task_id=}]")
    response.status_code = status.HTTP_202_ACCEPTED
    return LroInProgressResp(status_str=task_meta.state, task_id=task_meta.task_id, progress_message=prog_msg)
