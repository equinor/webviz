import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_check import (
    HydrostaticEquilibriumCheck,
)
from webviz_services.service_exceptions import ServiceLayerException
from webviz_services.sumo_access.grid3d_access import Grid3dAccess
from webviz_services.sumo_access.summary_access import SummaryAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.routers._shared.long_running_operations import LroFailureResp, LroInProgressResp, LroSuccessResp

from . import converters
from . import schemas



# pylint: disable=wrong-import-position, wrong-import-order, ungrouped-imports, unused-import

import hashlib
import time
from dataclasses import dataclass, fields
from azure.servicebus import ServiceBusMessage
from cryptography.fernet import Fernet
from fastapi import Response, status
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.utils.task_meta_tracker import TaskMeta, get_task_meta_tracker_for_user_id
from webviz_services.utils.task_meta_tracker import TaskState
from webviz_services.utils.user_cache import get_user_cache_for_user_id
from webviz_services.utils.sumo_blob_cache import SumoBlobCache
from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_types import HydrostaticGridCheckRealizationResult
from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_types import HydrostaticVectorCheckResult
from webviz_server_schemas.pyworker.messages import WorkerOperation
from webviz_server_schemas.pyworker.messages import QcCheckHydrostaticEquilVectorsMsg, QcHydrostaticEquilGridPropertiesMsg
from primary import config
from primary.utils.message_bus import MessageBus, MessageBusSingleton
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.routers._shared.long_running_operations import LroCommandResp

# pylint: enable=wrong-import-position, wrong-import-order, ungrouped-imports, unused-import


LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/hydrostatic_equilibrium_vector_check_hybrid")
async def get_hydrostatic_equilibrium_vector_check_hybrid(
    # fmt: off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    t0_iso: Annotated[str, Query(description="ISO date string of the t0 (initial) time step")],
    t1_iso: Annotated[str, Query(description="ISO date string of the t1 (later) time step")],
    # fmt: on
) -> LroSuccessResp[schemas.HydrostaticVectorCheckResult] | LroInProgressResp | LroFailureResp:
    """Check that there is no production/injection between t0 and t1 for the hydrostatic-equilibrium QC.

    Evaluates all realizations in the ensemble. The cumulative production/injection vectors are
    required to be zero at t1, and t1 must be sufficiently far from start of simulation (t0). The
    caller resolves `t0_iso`/`t1_iso` once (e.g. from a grid model's available property time steps)
    and passes them in - this endpoint never needs a grid name, grid access, or a realization of its
    own to determine the time steps.

    This endpoint is shaped as a hybrid long-running operation, matching the grid property check, so
    the contract is stable once a background execution mechanism lands for large ensembles. For now
    it always computes synchronously (fetching the checked vectors concurrently) and returns a
    success response.
    """

    """
    access_token = authenticated_user.get_sumo_access_token()
    check = HydrostaticEquilibriumCheck(
        ensemble_name=ensemble_name,
        grid3d_access=Grid3dAccess.from_ensemble_name(access_token, case_uuid, ensemble_name),
        summary_access=SummaryAccess.from_ensemble_name(access_token, case_uuid, ensemble_name),
    )

    try:
        result = await check.compute_vector_check_async(t0_iso=t0_iso, t1_iso=t1_iso)
    except ServiceLayerException as exc:
        LOGGER.exception("Vector check failed")
        return LroFailureResp(error_message=exc.message)

    return LroSuccessResp(result=converters.to_api_vector_check_result(result))
    """


    # --------------
    perf_metrics = ResponsePerfMetrics(response)

    user_id = authenticated_user.get_user_id()
    sumo_access_token = authenticated_user.get_sumo_access_token()

    task_tracker = get_task_meta_tracker_for_user_id(user_id)
    user_cache = get_user_cache_for_user_id(user_id)

    fp_params = VectorsCheckParams(case_uuid=case_uuid, ensemble_name=ensemble_name, t0_iso=t0_iso, t1_iso=t1_iso)
    task_fp = await _compute_task_fp_async("qcVecCheck", authenticated_user, fp_params)

    # Cannot use SumoBlobCache for this task because we don't have any source object uuids to use for the cache key
    # Resort to UserCache for testing
    cache_key = task_fp
    perf_metrics.record_lap("init")

    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    if not task_meta:
        task_id = task_tracker.generate_task_id("qc")
        msg = QcCheckHydrostaticEquilVectorsMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            t0_iso_str=t0_iso,
            t1_iso_str=t1_iso,
            encrypted_access_token=_encrypt_access_token(sumo_access_token),
        )

        task_meta = await task_tracker.register_task_with_fingerprint_async(
            task_id=task_id,
            fingerprint=task_fp,
            ttl_s=5 * 60,
            expected_store_key=cache_key)

        message_bus: MessageBus = MessageBusSingleton.get_instance()
        sb_msg = ServiceBusMessage(subject=WorkerOperation.QC_CHECK_HYDROSTATIC_EQUIL_VECTORS, body=msg.model_dump_json())
        await message_bus.send_to_queue_async(queue_name="test-queue", message=sb_msg)

        LOGGER.info(f"Submitted QC task for vectors check [{task_meta.task_id=}]")
        response.status_code = status.HTTP_202_ACCEPTED
        return _make_lro_in_progress_resp(task_meta, "Task submitted")

    perf_metrics.record_lap("lookup")

    if task_meta.state == TaskState.SUCCEEDED:
        result: HydrostaticVectorCheckResult | None = await user_cache.get_pydantic_model_async(cache_key, HydrostaticVectorCheckResult, ser_fmt="msgpack")
        if result is None:
            LOGGER.error(f"QC task succeeded but no result found in cache [{task_meta.task_id=}]")
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            return _make_lro_failure_resp(task_meta, "Task succeeded but no result found in cache")

        return LroSuccessResp(result=converters.to_api_vector_check_result(result))

    if task_meta.state in [TaskState.FAILED, TaskState.CANCELLED]:
        LOGGER.error(f"QC task failed: {task_meta.status_message} ({task_meta.internal_error_message}) [{task_meta.task_id=}]")
        return _make_lro_failure_resp(task_meta)

    LOGGER.debug(f"Returning in-progress for QC task, timing: {perf_metrics.to_string()} [{task_meta.task_id=}]")
    response.status_code = status.HTTP_202_ACCEPTED
    return _make_lro_in_progress_resp(task_meta)



@router.get("/hydrostatic_equilibrium_grid_property_check_hybrid")
async def get_hydrostatic_equilibrium_grid_property_check_hybrid(
    # fmt: off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    realization: Annotated[int, Query(description="Realization to evaluate")],
    delete_task: Annotated[bool, Query(description="If true, deletes the server-side task metadata for this check")] = False,
    # fmt: on
) -> LroSuccessResp[schemas.HydrostaticGridCheckRealizationResult] | LroInProgressResp | LroFailureResp | LroCommandResp:
    """Check that dynamic 3D grid properties are unchanged between t0 and t1, for a single realization.

    Computed one realization at a time - the caller (frontend) issues one request per realization and
    aggregates/renders the results as they arrive, matching the eventual per-realization worker-queue
    execution model for large ensembles.

    This endpoint is shaped as a hybrid long-running operation so the contract is stable once that
    background execution lands.

    Only the raw per-property change metrics are returned; the client applies its own threshold to
    derive the pass/fail verdict, so changing the threshold does not trigger a recompute.
    """

    """
    access_token = authenticated_user.get_sumo_access_token()
    check = HydrostaticEquilibriumCheck(
        ensemble_name=ensemble_name,
        grid3d_access=Grid3dAccess.from_ensemble_name(access_token, case_uuid, ensemble_name),
    )

    try:
        result = await check.compute_grid_property_check_async(grid_name=grid_name, realization=realization)
    except ServiceLayerException as exc:
        LOGGER.exception("Grid property check failed")
        return LroFailureResp(error_message=exc.message)

    return LroSuccessResp(result=converters.to_api_grid_check_result(result))
    """


    # --------------
    perf_metrics = ResponsePerfMetrics(response)

    user_id = authenticated_user.get_user_id()
    sumo_access_token = authenticated_user.get_sumo_access_token()

    task_tracker = get_task_meta_tracker_for_user_id(user_id)
    blob_cache = SumoBlobCache.from_access_token(sumo_access_token, SumoBlobCache.Namespace.QC_CHECKS)

    fp_params = GridPropertyCheckParams(case_uuid=case_uuid, ensemble_name=ensemble_name, grid_name=grid_name, realization=realization)
    task_fp = await _compute_task_fp_async("qcGridPropCheck", authenticated_user, fp_params)
    cache_key = blob_cache.compute_cache_key(task_fp)
    perf_metrics.record_lap("init")

    if delete_task:
        was_deleted = await task_tracker.delete_task_by_fingerprint_async(task_fp)
        if was_deleted:
            LOGGER.info(f"Deleted QC task metadata for grid property check [{task_fp=}]")
            return LroCommandResp(command_ok=True, message="Task metadata deleted")
        else:
            LOGGER.warning(f"No QC task metadata found to delete for grid property check [{task_fp=}]")
            return LroCommandResp(command_ok=False, message="No task metadata found to delete")

    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    if not task_meta:
        task_id = task_tracker.generate_task_id("qc")
        msg = QcHydrostaticEquilGridPropertiesMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            grid_name=grid_name,
            realization=realization,
            encrypted_access_token=_encrypt_access_token(sumo_access_token),
        )

        task_meta = await task_tracker.register_task_with_fingerprint_async(
            task_id=task_id,
            fingerprint=task_fp,
            ttl_s=5 * 60,
            expected_store_key=cache_key)

        message_bus: MessageBus = MessageBusSingleton.get_instance()
        sb_msg = ServiceBusMessage(subject=WorkerOperation.QC_CHECK_HYDROSTATIC_EQUIL_GRID_PROPERTIES, body=msg.model_dump_json())
        await message_bus.send_to_queue_async(queue_name="test-queue", message=sb_msg)

        LOGGER.info(f"Submitted QC task for grid properties check [{task_meta.task_id=}]")
        response.status_code = status.HTTP_202_ACCEPTED
        return _make_lro_in_progress_resp(task_meta, "Task submitted")

    perf_metrics.record_lap("lookup")

    if task_meta.state == TaskState.SUCCEEDED:
        result: HydrostaticGridCheckRealizationResult | None = await blob_cache.get_pydantic_model_async(cache_key, HydrostaticGridCheckRealizationResult)
        if result is None:
            LOGGER.error(f"QC task succeeded but no result found in cache [{task_meta.task_id=}]")
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            return _make_lro_failure_resp(task_meta, "Task succeeded but no result found in cache")

        return LroSuccessResp(result=converters.to_api_grid_check_result(result))

    if task_meta.state in [TaskState.FAILED, TaskState.CANCELLED]:
        LOGGER.error(f"QC task failed: {task_meta.status_message} ({task_meta.internal_error_message}) [{task_meta.task_id=}]")
        return _make_lro_failure_resp(task_meta)

    LOGGER.debug(f"Returning in-progress for QC task, timing: {perf_metrics.to_string()} [{task_meta.task_id=}]")
    response.status_code = status.HTTP_202_ACCEPTED
    return _make_lro_in_progress_resp(task_meta)



@dataclass(frozen=True)
class BaseParams:
    case_uuid: str
    ensemble_name: str


@dataclass(frozen=True)
class VectorsCheckParams(BaseParams):
    t0_iso: str
    t1_iso: str


@dataclass(frozen=True)
class GridPropertyCheckParams(BaseParams):
    grid_name: str
    realization: int


async def _compute_task_fp_async(namespace: str, authenticated_user: AuthenticatedUser, params: BaseParams) -> str:
    sumo_fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)
    ensemble_fp = await sumo_fingerprinter.get_or_calc_ensemble_fp_async(params.case_uuid, params.ensemble_name)

    # Loop over all the dataclass fields and build a list of string like "field_name=field_value"
    field_parts = []
    for field in fields(params):
        field_parts.append(f"{field.name}={getattr(params, field.name)}")

    task_params_as_str = ":".join(field_parts)

    # 8 bytes = 16 hex chars = 64 bits should be enough to avoid collisions for our use case
    task_fp = hashlib.shake_128((ensemble_fp + task_params_as_str).encode()).hexdigest(8)
    return f"taskFP_{namespace}__{task_fp}"


def _encrypt_access_token(access_token: str) -> bytes:
    fernet = Fernet(config.SERVICE_BUS_PAYLOAD_FERNET_KEY)
    encrypted_access_token = fernet.encrypt(access_token.encode())
    return encrypted_access_token


def _make_lro_in_progress_resp(task_meta: TaskMeta, progress_message: str | None = None) -> LroInProgressResp:
    if progress_message is None:
        status_text = f" - {task_meta.status_message}" if task_meta.status_message else ""
        elapsed_task_time_s = time.time() - task_meta.registered_at_utc_s
        progress_message = f"Task {task_meta.state}{status_text} ({elapsed_task_time_s:.1f}s elapsed)"

    return LroInProgressResp(task_id=task_meta.task_id, status_str=task_meta.state, progress_message=progress_message)


def _make_lro_failure_resp(task_meta: TaskMeta, custom_error_message: str | None = None) -> LroFailureResp:
    if custom_error_message is not None:
        return LroFailureResp(task_id=task_meta.task_id, error_message=custom_error_message)

    if task_meta.state in [TaskState.FAILED, TaskState.CANCELLED]:
        reason = task_meta.status_message or "Unknown reason"
        error_message = f"Task {task_meta.state}: {reason}"
        return LroFailureResp(task_id=task_meta.task_id, error_message=error_message)

    return LroFailureResp(task_id=task_meta.task_id, error_message="Task failed")
