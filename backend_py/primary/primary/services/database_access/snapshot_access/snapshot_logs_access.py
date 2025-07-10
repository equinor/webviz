import logging
from datetime import datetime, timezone


from primary.services.database_access.container_access import ContainerAccess
from primary.services.service_exceptions import ServiceRequestError

from .query_collation_options import QueryCollationOptions
from .models import SnapshotAccessLog
from .util import make_access_log_item_id


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
        await self._container_access.close_async()

    async def get_access_logs_for_user_async(self, collation_options: QueryCollationOptions) -> list[SnapshotAccessLog]:
        query = "SELECT * FROM c WHERE c.visitor_id = @visitor_id"
        params = [{"name": "@visitor_id", "value": self._user_id}]

        search_options = collation_options.to_sql_query_string("c")

        if search_options:
            query = f"{query} {search_options}"

        return await self._container_access.query_items_async(query, params)  # type: ignore[arg-type]

    async def create_access_log_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLog:
        new_log = SnapshotAccessLog(
            visitor_id=self._user_id,
            snapshot_id=snapshot_id,
            snapshot_owner_id=snapshot_owner_id,
        )

        _inserted_id = await self._container_access.insert_item_async(new_log)

        return new_log

    async def get_access_log_async(self, snapshot_id: str) -> SnapshotAccessLog:
        item_id = make_access_log_item_id(snapshot_id, self._user_id)

        return await self._container_access.get_item_async(item_id, partition_key=self._user_id)

    async def get_existing_or_new_log_item_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLog:
        """
        Returns an already stored log item if it exists, otherwise, creates a new instance.

        **Note: This does create a new entry in the database!**
        """
        try:
            return await self.get_access_log_async(snapshot_id)
        except ServiceRequestError:
            return SnapshotAccessLog(
                visitor_id=self._user_id,
                snapshot_id=snapshot_id,
                snapshot_owner_id=snapshot_owner_id,
            )

    async def log_snapshot_visit_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLog:
        timestamp = datetime.now(timezone.utc)

        # Should we wrap this?
        # try:
        #   <body>
        # except Exception as e:
        #   raise ServiceRequestError(f"Failed to log snapshot visit: {str(e)}", Service.DATABASE) from e
        log = await self.get_existing_or_new_log_item_async(snapshot_id, snapshot_owner_id)
        log.visits += 1
        log.last_visited_at = timestamp

        if not log.first_visited_at:
            log.first_visited_at = timestamp

        await self._container_access.update_item_async(log.id, log)

        return log
