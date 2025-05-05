from backend_py.primary.primary.services.database_access.database_access import ContainerAccess, DatabaseAccess


class DashboardAccess:
    def __init__(self):
        self.container_access = ContainerAccess("persistence", "dashboards")

    def get_dashboard_by_id(self, dashboard_id):
        query = f"SELECT * FROM dashboards WHERE id = '{dashboard_id}'"
        return self.container_access.query_items(query)

    def get_all_dashboards(self):
        query = "SELECT * FROM dashboards"
        self.db.execute(query)
        return self.db.fetchall()