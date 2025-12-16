import logging
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from webviz_services.sumo_access.parameter_access import ParameterAccess
from webviz_services.sumo_access.parameter_types import EnsembleParameter, EnsembleSensitivity
from webviz_services.utils.authenticated_user import AuthenticatedUser

from . import schemas, converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/parameters_and_sensitivities/")
async def get_parameters_and_sensitivities(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.EnsembleParametersAndSensitivities:
    access = ParameterAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameters_and_sensitivities = await access.get_parameters_and_sensitivities_async()
    return schemas.EnsembleParametersAndSensitivities(
        parameters=converters.to_api_parameters(parameters_and_sensitivities.parameters),
        sensitivities=converters.to_api_sensitivities(parameters_and_sensitivities.sensitivities),
    )
