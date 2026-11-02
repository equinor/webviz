import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from webviz_server_schemas.pyworker.messages import (
    QcHydrostaticEquilGridPropertyCheckMsg,
    QcHydrostaticEquilVectorCheckMsg,
    WorkerOperation,
)
from webviz_services.operations.hydrostatic_equilibrium_check import hydrostatic_equilibrium_types as he_types

from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from primary.utils.response_perf_metrics import ResponsePerfMetrics

from .._shared.long_running_operations import LroCommandResp, LroFailureResp, LroInProgressResp, LroSuccessResp
from . import converters, schemas
from .task_helpers import compute_qc_task_fingerprint_async, run_hybrid_qc_task_async

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
    realizations: Annotated[list[int] | None, Query(description="Realizations to evaluate. All realizations if omitted")] = None,
    retry_task: Annotated[bool | None, Query(description="Can be used to retry the check task")] = None,
    # fmt: on
) -> LroSuccessResp[schemas.HydrostaticVectorCheckResult] | LroInProgressResp | LroFailureResp | LroCommandResp:
    """Check that there is no production/injection between t0 and t1 for the hydrostatic-equilibrium QC.

    Evaluates all (or the requested) realizations in the ensemble. The cumulative production/injection vectors are
    required to be zero at t1, and t1 must be sufficiently far from start of simulation (t0). The caller resolves
    `t0_iso`/`t1_iso` once (e.g. from a grid model's available property time steps) and passes them in.

    Hybrid long-running operation: the check is computed by a worker task and the result is cached.
    """
    perf_metrics = ResponsePerfMetrics(response)
    user_id = authenticated_user.get_user_id()

    task_fp = await compute_qc_task_fingerprint_async(
        authenticated_user,
        case_uuid,
        ensemble_name,
        "qcVecCheck",
        {"t0_iso": t0_iso, "t1_iso": t1_iso, "realizations": sorted(realizations) if realizations else None},
    )

    def make_msg(task_id: str, encrypted_access_token: bytes) -> QcHydrostaticEquilVectorCheckMsg:
        return QcHydrostaticEquilVectorCheckMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            t0_iso=t0_iso,
            t1_iso=t1_iso,
            realizations=realizations,
            encrypted_access_token=encrypted_access_token,
        )

    return await run_hybrid_qc_task_async(
        response=response,
        authenticated_user=authenticated_user,
        task_fp=task_fp,
        result_model=he_types.HydrostaticVectorCheckResult,
        to_api_result=converters.to_api_vector_check_result,
        make_msg=make_msg,
        worker_op=WorkerOperation.QC_HYDROSTATIC_EQUIL_VECTOR_CHECK,
        retry_task=retry_task,
        perf_metrics=perf_metrics,
    )


@router.get("/hydrostatic_equilibrium_grid_property_check_hybrid")
async def get_hydrostatic_equilibrium_grid_property_check_hybrid(
    # fmt: off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    realization: Annotated[int, Query(description="Realization to evaluate")],
    retry_task: Annotated[bool | None, Query(description="Can be used to retry the check task")] = None,
    # fmt: on
) -> (
    LroSuccessResp[schemas.HydrostaticGridCheckRealizationResult] | LroInProgressResp | LroFailureResp | LroCommandResp
):
    """Check that dynamic 3D grid properties are unchanged between t0 and t1, for a single realization.

    Computed one realization at a time - the caller issues one request per realization and aggregates the results
    as they arrive. Only the raw per-property change metrics are returned; the client applies its own threshold to
    derive the pass/fail verdict, so changing the threshold does not trigger a recompute.

    Hybrid long-running operation: the check is computed by a worker task and the result is cached.
    """
    perf_metrics = ResponsePerfMetrics(response)
    user_id = authenticated_user.get_user_id()

    task_fp = await compute_qc_task_fingerprint_async(
        authenticated_user,
        case_uuid,
        ensemble_name,
        "qcGridPropCheck",
        {"grid_name": grid_name, "realization": realization},
    )

    def make_msg(task_id: str, encrypted_access_token: bytes) -> QcHydrostaticEquilGridPropertyCheckMsg:
        return QcHydrostaticEquilGridPropertyCheckMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            grid_name=grid_name,
            realization=realization,
            encrypted_access_token=encrypted_access_token,
        )

    return await run_hybrid_qc_task_async(
        response=response,
        authenticated_user=authenticated_user,
        task_fp=task_fp,
        result_model=he_types.HydrostaticGridCheckRealizationResult,
        to_api_result=converters.to_api_grid_check_result,
        make_msg=make_msg,
        worker_op=WorkerOperation.QC_HYDROSTATIC_EQUIL_GRID_PROPERTY_CHECK,
        retry_task=retry_task,
        perf_metrics=perf_metrics,
    )
