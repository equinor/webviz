import logging
from typing import List

from fastapi import APIRouter, Depends

from primary.services.database_access.dashboard_access import DashboardAccess
from primary.routers.persistence import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboards/", response_model=List[schemas.Dashboard])
async def get_dashboards(
    dashboard_access: DashboardAccess = DashboardAccess.fastapi_dependency(),
):
    """
    Get all dashboards for the authenticated user.
    """
    return await dashboard_access.get_all_dashboards_for_user()


@router.get("/dashboard/", response_model=schemas.Dashboard)
async def get_dashboard(
    dashboard_id: str,
    dashboard_access: DashboardAccess = DashboardAccess.fastapi_dependency(),
):
    """
    Get a specific dashboard by ID for the authenticated user.
    """
    dashboard = await dashboard_access.get_dashboard_by_id(dashboard_id)
    if not dashboard:
        # You could raise HTTPException(404) here if desired
        raise ValueError("Dashboard not found")
    return dashboard


@router.post("/dashboard/")
async def create_dashboard(
    dashboard: schemas.Dashboard,
    dashboard_access: DashboardAccess = DashboardAccess.fastapi_dependency(),
) -> None:
    """
    Create a new dashboard for the authenticated user.
    """
    await dashboard_access.insert_dashboard(dashboard)


@router.delete("/dashboard/")
async def delete_dashboard(
    dashboard_id: str,
    dashboard_access: DashboardAccess = DashboardAccess.fastapi_dependency(),
) -> None:
    """
    Delete a specific dashboard by ID for the authenticated user.
    """
    await dashboard_access.delete_dashboard(dashboard_id)


@router.put("/dashboard/")
async def update_dashboard(
    dashboard_id: str,
    updated_dashboard: schemas.Dashboard,
    dashboard_access: DashboardAccess = DashboardAccess.fastapi_dependency(),
) -> None:
    """
    Update a specific dashboard by ID for the authenticated user.
    """
    await dashboard_access.update_dashboard(dashboard_id, updated_dashboard)
