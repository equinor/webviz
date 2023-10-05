import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from src.services.sumo_access.seismic_access import SeismicAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/seismic_directory/")
async def get_seismic_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.SeismicCubeMeta]:
    """
    Get a directory of seismic cubes.
    """
    access = await SeismicAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    seismic_cube_metas = await access.get_seismic_directory()
    try:
        return [schemas.SeismicCubeMeta(**meta.__dict__) for meta in seismic_cube_metas]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
