import logging

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.observation_access import ObservationAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/observations/")
async def get_observations(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    # fmt:on
) -> schemas.Observations:
    """Retrieve all observations found in sumo case"""
    access = ObservationAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    observations = await access.get_observations_async()

    ret_observations = schemas.Observations.model_validate(observations.model_dump())
    return ret_observations
