import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from primary.services.database_access.private_dashboard_access import PrivateDashboardAccess
from primary.services.database_access.types import PrivateDashboard, DashboardMetadata
from primary.auth.auth_helper import AuthHelper
from primary.auth.auth_helper import AuthenticatedUser

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/dashboards", response_model=List[DashboardMetadata])
async def get_dashboards_metadata(user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await PrivateDashboardAccess.create(user.get_user_id())
    async with access:
        return await access.get_all_dashboards_metadata_for_user()


@router.get("/dashboards/{dashboard_id}", response_model=PrivateDashboard)
async def get_dashboard(dashboard_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await PrivateDashboardAccess.create(user.get_user_id())
    async with access:
        dashboard = await access.get_dashboard_by_id(dashboard_id)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        return dashboard


@router.post("/dashboards", response_model=str)
async def create_dashboard(
    dashboard: PrivateDashboard, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
):
    access = await PrivateDashboardAccess.create(user.get_user_id())
    async with access:
        await access.insert_dashboard(dashboard)
        return dashboard.id


@router.put("/dashboards/{dashboard_id}")
async def update_dashboard(
    dashboard_id: str,
    updated_dashboard: PrivateDashboard,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    access = await PrivateDashboardAccess.create(user.get_user_id())
    async with access:
        await access.update_dashboard(dashboard_id, updated_dashboard)


@router.delete("/dashboards/{dashboard_id}")
async def delete_dashboard(dashboard_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await PrivateDashboardAccess.create(user.get_user_id())
    async with access:
        await access.delete_dashboard(dashboard_id)
