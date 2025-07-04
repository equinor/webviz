import logging
from datetime import datetime, timezone


from primary.services.database_access.container_access import ContainerAccess
from .query_collation_options import QueryCollationOptions
from .types import SnapshotAccessLog


LOGGER = logging.getLogger(__name__)


class SnapshotLogsAccess:
    DATABASE_NAME = "persistence"
    CONTAINER_NAME = "snapshot_access_log"

    def __init__(self, user_id: str, container_access: ContainerAccess[SnapshotAccessLog]):
        self._user_id = user_id
        self._container_access = container_access

    @classmethod
    def create(cls, user_id: str) -> "SnapshotLogsAccess":
        container_access = ContainerAccess.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SnapshotAccessLog)

        return cls(user_id, container_access)

    async def __aenter__(self) -> "SnapshotLogsAccess":
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object | None
    ) -> None:
        # Clean up if needed (e.g., closing DB connections)
        pass

    async def get_access_logs_for_user_async(self, collation_options: QueryCollationOptions) -> list[SnapshotAccessLog]:
        query = f"SELECT * FROM c WHERE c.user_id = '{self._user_id}'"
        search_options = collation_options.to_sql_query_string("c")

        if search_options:
            query = f"{query} {search_options}"

        return await self._container_access.query_items_async(query)

    async def create_access_log_async(
        self,
        snapshot_id: str,
    ) -> SnapshotAccessLog:
        new_log = SnapshotAccessLog(user_id=self._user_id, snapshot_id=snapshot_id)

        _inserted_id = await self._container_access.insert_item_async(new_log)

        return new_log

    async def get_access_log_async(self, snapshot_id: str) -> SnapshotAccessLog | None:
        query = f"SELECT * FROM c WHERE c.user_id = '{self._user_id}' AND c.snapshot_id = '{snapshot_id}'"
        items = await self._container_access.query_items_async(query)

        if not items:
            return None

        # ? Is there a "pick one" query?
        if len(items) > 2:
            LOGGER.warning("Multiple entries")

        return items[0]

    async def get_or_create_access_log_async(self, snapshot_id: str) -> SnapshotAccessLog:
        existing_log = await self.get_access_log_async(snapshot_id)
        if existing_log:
            return existing_log

        return await self.create_access_log_async(snapshot_id)

    async def log_snapshot_visit_async(self, snapshot_id: str) -> SnapshotAccessLog:
        timestamp = datetime.now(timezone.utc)

        # Should we wrap this?
        # try:
        #   <body>
        # except Exception as e:
        #   raise ServiceRequestError(f"Failed to log snapshot visit: {str(e)}", Service.DATABASE) from e
        log = await self.get_or_create_access_log_async(snapshot_id)
        log.visits += 1
        log.last_visited_at = timestamp

        if not log.first_visited_at:
            log.first_visited_at = timestamp

        await self._container_access.update_item_async(log.id, log)

        return log
