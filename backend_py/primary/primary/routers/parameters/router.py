import logging

from fastapi import APIRouter, Depends, Query

from webviz_services.sumo_access.parameter_access import ParameterAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, CacheTime

from . import schemas, converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/parameters_and_sensitivities/")
@cache_time(CacheTime.LONG)
async def get_parameters_and_sensitivities(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> schemas.EnsembleParametersAndSensitivities:
    access = ParameterAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameters, sensitivities = await access.get_parameters_and_sensitivities_async()

    return schemas.EnsembleParametersAndSensitivities(
        parameters=converters.to_api_parameters(parameters),
        sensitivities=converters.to_api_sensitivities(sensitivities),
    )
