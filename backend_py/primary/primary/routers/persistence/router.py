import logging
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, Query

from backend_py.primary.primary.services.database_access.dashboard_access import DashboardAccess
from backend_py.primary.primary.services.database_access.database_access import DatabaseAccess
from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.parameter_access import ParameterAccess
from primary.services.sumo_access.parameter_types import EnsembleParameter, EnsembleSensitivity
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboards/")
async def get_dashboards(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    # fmt:on
) -> List[schemas.Dashboard]:
    """
    Get all dashboards for the authenticated user.
    """
    dashboard_access = DashboardAccess()
    dashboards = dashboard_access.get_all_dashboards()
    

@router.get("/dashboard/")
async def get_dashboard(
    dashboard_id: str,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.Dashboard:
    """
    Get a specific dashboard by ID for the authenticated user.
    """
    database_access = DatabaseAccess()
    dashboard = database_access.get_dashboard_by_id(dashboard_id)
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return dashboard