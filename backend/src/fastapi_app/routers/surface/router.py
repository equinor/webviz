import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from ....services.sumo_access.surface_access import SurfaceAccess
from ....services.utils.authenticated_user import AuthenticatedUser
from ....services.utils.perf_timer import PerfTimer
from ...auth.auth_helper import AuthHelper
from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dynamic_surface_directory/")
def get_dynamic_surface_directory(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.DynamicSurfaceDirectory]:
    """
    Get a directory of surface names, attributes and time/interval strings for simulated dynamic surfaces.
    """
    access = SurfaceAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    surf_dir = access.get_dynamic_surf_dir()

    ret_dir = schemas.DynamicSurfaceDirectory(
        names=surf_dir.names,
        attributes=surf_dir.attributes,
        time_or_interval_strings=surf_dir.date_strings,
    )

    return ret_dir
