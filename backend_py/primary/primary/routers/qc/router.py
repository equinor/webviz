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

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/hydrostatic_equilibrium_vector_check_hybrid")
async def get_hydrostatic_equilibrium_vector_check_hybrid(
    # fmt: off
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


@router.get("/hydrostatic_equilibrium_grid_property_check_hybrid")
async def get_hydrostatic_equilibrium_grid_property_check_hybrid(
    # fmt: off
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    grid_name: Annotated[str, Query(description="Grid name")],
    realization: Annotated[int, Query(description="Realization to evaluate")],
    # fmt: on
) -> LroSuccessResp[schemas.HydrostaticGridCheckRealizationResult] | LroInProgressResp | LroFailureResp:
    """Check that dynamic 3D grid properties are unchanged between t0 and t1, for a single realization.

    Computed one realization at a time - the caller (frontend) issues one request per realization and
    aggregates/renders the results as they arrive, matching the eventual per-realization worker-queue
    execution model for large ensembles.

    This endpoint is shaped as a hybrid long-running operation so the contract is stable once that
    background execution lands.

    Only the raw per-property change metrics are returned; the client applies its own threshold to
    derive the pass/fail verdict, so changing the threshold does not trigger a recompute.
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
