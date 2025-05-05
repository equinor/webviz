import logging
from typing import List

from fastapi import APIRouter, Body, Depends

from primary.services.database_access.dashboard_access import DashboardAccess
from primary.auth.auth_helper import AuthHelper
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()

@router.get("/dashboards/")
async def get_dashboards(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[schemas.Dashboard]:
    """
    Get all dashboards for the authenticated user.
    """
    dashboard_access = await DashboardAccess.create(authenticated_user)
    dashboards = await dashboard_access.get_all_dashboards_for_user()
    return dashboards

@router.get("/dashboard/")
async def get_dashboard(
    dashboard_id: str,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.Dashboard:
    """
    Get a specific dashboard by ID for the authenticated user.
    """
    dashboard_access = await DashboardAccess.create(authenticated_user)
    dashboard = await dashboard_access.get_dashboard_by_id(dashboard_id)
    return dashboard

@router.post("/dashboard/")
async def create_dashboard(
    dashboard: schemas.Dashboard,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    """
    Create a new dashboard for the authenticated user.
    """
    dashboard_access = await DashboardAccess.create(authenticated_user)
    await dashboard_access.insert_dashboard(dashboard)

@router.delete("/dashboard/")
async def delete_dashboard(
    dashboard_id: str,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    """
    Delete a specific dashboard by ID for the authenticated user.
    """
    dashboard_access = await DashboardAccess.create(authenticated_user)
    await dashboard_access.delete_dashboard(dashboard_id)

@router.put("/dashboard/")
async def update_dashboard(
    dashboard_id: str,
    updated_dashboard: schemas.Dashboard,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    """
    Update a specific dashboard by ID for the authenticated user.
    """
    dashboard_access = await DashboardAccess.create(authenticated_user)
    await dashboard_access.update_dashboard(dashboard_id, updated_dashboard)
