import logging
from typing import List, Tuple

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from webviz_services.sumo_access.parameter_access import ParameterAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser

from . import schemas, converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/parameters_and_sensitivities/")
async def get_parameters_and_sensitivities(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> Tuple[List[schemas.EnsembleParameter], List[schemas.EnsembleSensitivity]]:
    access = ParameterAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameters, sensitivities = await access.get_parameters_and_sensitivities_async()

    return (
        converters.to_api_parameters(parameters),
        converters.to_api_sensitivities(sensitivities),
    )
