import logging
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.parameter_access import ParameterAccess
from primary.services.sumo_access.parameter_types import EnsembleParameter, EnsembleSensitivity
from primary.services.utils.authenticated_user import AuthenticatedUser

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
    sort_order: Literal["alphabetically", "standard_deviation"] = Query("alphabetically", description="Sort order"),
    # fmt:on
) -> List[schemas.EnsembleParameterDescription]:
    """Retrieve parameter names and description for an ensemble"""
    access = await ParameterAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameters = (await access.get_parameters_and_sensitivities()).parameters
    if exclude_all_values_constant:
        parameters = [p for p in parameters if not p.is_constant]
    if sort_order == "alphabetically":
        parameters = sorted(parameters, key=lambda p: p.name.lower())
    # temporary
    # parameters = [p for p in parameters if p.group_name and "GLOBVAR" in p.group_name]
    return [
        schemas.EnsembleParameterDescription(
            name=parameter.name,
            descriptive_name=parameter.descriptive_name,
            group_name=parameter.group_name,
            is_discrete=parameter.is_discrete,
        )
        for parameter in parameters
    ]


@router.get("/parameter/")
async def get_parameter(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    parameter_name: str = Query(description="Parameter name"),
) -> Optional[EnsembleParameter]:
    """Get a parameter in a given Sumo ensemble"""

    access = await ParameterAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameters = (await access.get_parameters_and_sensitivities()).parameters
    for parameter in parameters:
        if parameter.name == parameter_name:
            return parameter
    return None


@router.get("/parameters/")
async def get_parameters(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[EnsembleParameter]:
    access = await ParameterAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameters = (await access.get_parameters_and_sensitivities()).parameters
    return [parameter for parameter in parameters]


@router.get("/is_sensitivity_run/")
async def is_sensitivity_run(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> bool:
    """Check if a given Sumo ensemble is a sensitivity run"""

    access = await ParameterAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameters = await access.get_parameters_and_sensitivities()
    return parameters.sensitivities is not None


@router.get("/sensitivities/")
async def get_sensitivities(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[EnsembleSensitivity]:
    """Get sensitivities in a given Sumo ensemble"""

    access = await ParameterAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    sensitivities = (await access.get_parameters_and_sensitivities()).sensitivities
    return sensitivities if sensitivities else []
