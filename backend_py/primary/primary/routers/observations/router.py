import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from webviz_services.sumo_access.observation_access import ObservationAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, CacheTime

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/summary_observations")
@cache_time(CacheTime.LONG)
async def get_summary_observations(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.SummaryVectorObservations]:
    """Retrieve all summary observations found in ensemble"""
    access = ObservationAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    observations = await access.get_summary_observations_async()
    return [schemas.SummaryVectorObservations.model_validate(observation.model_dump()) for observation in observations]
