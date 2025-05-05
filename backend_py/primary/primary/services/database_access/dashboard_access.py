from primary.routers.persistence import schemas
from primary.services.database_access.database_access import ContainerAccess
from primary.services.utils.authenticated_user import AuthenticatedUser


class DashboardAccess:
    def __init__(self, user: AuthenticatedUser, container_access: ContainerAccess):
        self.container_access = container_access
        self.user = user

    @classmethod
    async def create(cls, user: AuthenticatedUser):
        container_access = await ContainerAccess.create("persistence", "dashboards")
        return cls(user, container_access)

    async def __aenter__(self):
        await self.container_access.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.container_access.__aexit__(exc_type, exc_val, exc_tb)

    async def get_dashboard_by_id(self, dashboard_id: str):
        query = f"SELECT * FROM c WHERE c.id = '{dashboard_id}'"
        items = await self.container_access.query_items(query)
        return items[0] if items else None

    async def get_all_dashboards_for_user(self):
        query = f"SELECT * FROM c WHERE c.user_id = '{self.user.get_user_id()}'"
        return await self.container_access.query_items(query)

    async def insert_dashboard(self, dashboard: dict | schemas.Dashboard):
        if isinstance(dashboard, dict):
            item = dashboard
        else:
            item = dashboard.model_dump()

        item["user_id"] = self.user.get_user_id()

        await self.container_access.insert_item(item)
        print("Dashboard inserted.")

    async def delete_dashboard(self, dashboard_id: str):
        await self.container_access.delete_item(dashboard_id)
        print(f"Dashboard with id '{dashboard_id}' deleted.")

    async def update_dashboard(self, dashboard_id: str, updated_dashboard: dict):
        await self.container_access.update_item(dashboard_id, updated_dashboard)
        print(f"Dashboard with id '{dashboard_id}' updated.")
