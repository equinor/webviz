import logging

from fastapi import APIRouter, Depends, Query

from webviz_services.ensemble_parameters_assembler.ensemble_parameters_assembler import EnsembleParametersAssembler
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, set_cache_time, CacheTime

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
    """Get parameters and sensitivities for an ensemble, combined with the parameters of the ensembles it was
    restarted from.

    The browser cache is keyed on this ensemble's fingerprint only. This is sufficient since the ensembles it was
    restarted from are expected not to change once restarted from. An ensemble in the restart chain that could not
    be found may become accessible later, so such responses are cached for a shorter time.
    """
    assembler = EnsembleParametersAssembler.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameters_and_sensitivities = await assembler.get_parameters_and_sensitivities_async()
    if parameters_and_sensitivities.has_unresolved_restart_ensemble:
        set_cache_time(CacheTime.NORMAL)

    return schemas.EnsembleParametersAndSensitivities(
        parameters=converters.to_api_parameters(parameters_and_sensitivities.parameters),
        sensitivities=converters.to_api_sensitivities(parameters_and_sensitivities.sensitivities),
        warnings=parameters_and_sensitivities.warnings,
    )
