from typing import Optional, List
from datetime import datetime

from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.types import PrivateDashboard, DashboardMetadata


class PrivateDashboardAccess:
    def __init__(self, user_id: str, container_access: ContainerAccess):
        self.user_id = user_id
        self.container_access = container_access

    @classmethod
    async def create(cls, user_id: str) -> "PrivateDashboardAccess":
        container = await ContainerAccess.create("persistence", "private_dashboards")
        return cls(user_id=user_id, container_access=container)

    async def get_dashboard_by_id(self, dashboard_id: str) -> Optional[PrivateDashboard]:
        # Always restrict by user_id to prevent unauthorized access
        query = f"SELECT * FROM c WHERE c.id = '{dashboard_id}' AND c.user_id = '{self.user_id}'"
        items = await self.container_access.query_items(query)
        return PrivateDashboard(**items[0]) if items else None

    async def get_all_dashboards_for_user(self) -> List[PrivateDashboard]:
        query = f"SELECT * FROM c WHERE c.user_id = '{self.user_id}'"
        items = await self.container_access.query_items(query)
        return [PrivateDashboard(**item) for item in items]

    async def get_all_dashboards_metadata_for_user(self) -> List[DashboardMetadata]:
        query = f"SELECT * FROM c WHERE c.user_id = '{self.user_id}'"
        items = await self.container_access.query_items(query)
        return [DashboardMetadata(**item.metadata) for item in items]

    async def insert_dashboard(self, dashboard: PrivateDashboard):
        item = dashboard.model_dump(by_alias=True, mode="json")
        await self.container_access.insert_item(item)

    async def delete_dashboard(self, dashboard_id: str):
        await self._assert_ownership(dashboard_id)
        await self.container_access.delete_item(dashboard_id)

    async def update_dashboard(self, dashboard_id: str, updated_dashboard: PrivateDashboard):
        existing = await self._assert_ownership(dashboard_id)

        # Version bump and timestamp update
        updated_dashboard.version = existing.version + 1
        updated_dashboard.metadata.updated_at = datetime.utcnow()

        item = updated_dashboard.model_dump(by_alias=True, mode="json")
        await self.container_access.update_item(dashboard_id, item)

    async def _assert_ownership(self, dashboard_id: str) -> PrivateDashboard:
        dashboard = await self._get_dashboard_raw_by_id(dashboard_id)

        if not dashboard:
            raise ServiceRequestError(f"Dashboard with id '{dashboard_id}' not found.", Service.DATABASE)

        if dashboard.user_id != self.user_id:
            raise ServiceRequestError(
                f"You do not have permission to access the dashboard: '{dashboard_id}'.", Service.DATABASE
            )

        return dashboard

    async def _get_dashboard_raw_by_id(self, dashboard_id: str) -> Optional[PrivateDashboard]:
        query = f"SELECT * FROM c WHERE c.id = '{dashboard_id}'"
        items = await self.container_access.query_items(query)
        return PrivateDashboard(**items[0]) if items else None
