import datetime
import logging
from typing import List, Optional, Literal

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.sumo_access.parameter_access import ParameterAccess, EnsembleParameter, EnsembleSensitivity
from src.services.utils.authenticated_user import AuthenticatedUser
from src.services.utils.perf_timer import PerfTimer
from src.fastapi_app.auth.auth_helper import AuthHelper
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/parameter_names_and_description/")
async def get_parameter_names_and_description(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    exclude_all_values_constant: bool = Query(True, description="Exclude all parameters where all values are the same value"),
    sort_order: Optional[Literal[None,"alphabetically", "standard_deviation"]] = Query("alphabetically", description="Sort order"),
    # fmt:on
) -> List[schemas.EnsembleParameterDescription]:
    """Retrieve parameter names and description for an ensemble"""
    access = ParameterAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameters = access.get_parameters()
    if exclude_all_values_constant:
        parameters = [p for p in parameters if not len(set(p.values)) == 1]
    if sort_order == "alphabetically":
        parameters = sorted(parameters, key=lambda p: p.name.lower())
    # temporary
    parameters = [p for p in parameters if p.group_name and "GLOBVAR" in p.group_name]
    return [
        schemas.EnsembleParameterDescription(
            name=parameter.name,
            descriptive_name=parameter.descriptive_name,
            group_name=parameter.group_name,
            is_numerical=parameter.is_numerical,
        )
        for parameter in parameters
    ]


@router.get("/parameter/")
async def get_parameter(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    parameter_name: str = Query(description="Parameter name"),
    # fmt:on
) -> Optional[EnsembleParameter]:
    """Get a parameter in a given Sumo ensemble"""

    access = ParameterAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameters = access.get_parameters()
    for parameter in parameters:
        if parameter.name == parameter_name:
            return parameter
    return None


@router.get("/is_sensitivity_run/")
async def is_sensitivity_run(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    # fmt:on
) -> bool:
    """Check if a given Sumo ensemble is a sensitivity run"""

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