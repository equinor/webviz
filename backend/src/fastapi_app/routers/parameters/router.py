import datetime
import logging
from typing import List, Optional, Sequence, Union

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query

from ....services.sumo_access.parameter_access import ParameterAccess, EnsembleParameter, EnsembleSensitivity
from ....services.utils.authenticated_user import AuthenticatedUser
from ....services.utils.perf_timer import PerfTimer
from ...auth.auth_helper import AuthHelper

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/parameters/")
async def get_parameters(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    exclude_all_values_constant: bool = Query(True, description="Exclude all parameters where all values are the same value"),
    # fmt:on
) -> List[EnsembleParameter]:
    """Get all parameters in a given Sumo ensemble"""

    access = ParameterAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameters = access.get_parameters()
    if exclude_all_values_constant:
        parameters = [p for p in parameters if not len(set(p.values)) == 1]
    return parameters


@router.get("/is_sensitivity_run/")
async def is_sensitivity_run(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    # fmt:on
) -> bool:
    """Get all parameters in a given Sumo ensemble"""

    access = ParameterAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return access.is_sensitivity_run()


@router.get("/sensitivities/")
async def get_sensitivities(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    # fmt:on
) -> List[EnsembleSensitivity]:
    """Get sensitivities in a given Sumo ensemble"""

    access = ParameterAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    if not access.is_sensitivity_run():
        return []
    sensitivities = access.get_sensitivities()
    return sensitivities
