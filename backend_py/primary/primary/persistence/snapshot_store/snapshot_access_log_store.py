import logging
from datetime import datetime, timezone
from typing import Any, Optional, Type


from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.cosmosdb.exceptions import DatabaseAccessError, DatabaseAccessNotFoundError
from primary.services.service_exceptions import Service, ServiceRequestError

from primary.persistence.cosmosdb.query_collation_options import QueryCollationOptions
from .documents import SnapshotAccessLogDocument
from .utils import make_access_log_item_id

from .snapshot_store import SnapshotStore


LOGGER = logging.getLogger(__name__)


class SnapshotAccessLogStore:
    """
    SnapshotAccessLogStore handles logging of snapshot visits by users.
    It allows for creating, updating, and retrieving access logs for snapshots.
    """

    DATABASE_NAME = "persistence"
    CONTAINER_NAME = "snapshot_access_logs"

    def __init__(self, user_id: str, container: CosmosContainer[SnapshotAccessLogDocument]):
        self._user_id = user_id
        self._container = container

    @classmethod
    def create(cls, user_id: str) -> "SnapshotAccessLogStore":
        container = CosmosContainer.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SnapshotAccessLogDocument)

        return cls(user_id, container)

    async def __aenter__(self) -> "SnapshotAccessLogStore":
        return self

    async def __aexit__(
        self, exc_type: Optional[Type[BaseException]], exc_val: Optional[BaseException], exc_tb: Optional[object]
    ) -> None:
        # Clean up if needed (e.g., closing DB connections)
        await self._container.close_async()

    async def update_log_async(self, snapshot_id: str, changes: dict[str, Any]) -> None:
        try:
            existing = await self.get_access_log_async(snapshot_id)

            updated_item = existing.model_copy(update=changes)

            await self._container.update_item_async(snapshot_id, snapshot_id, updated_item)
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to update access log: {str(e)}", Service.DATABASE) from e

    async def get_access_logs_for_user_async(
        self, collation_options: QueryCollationOptions
    ) -> list[SnapshotAccessLogDocument]:
        try:
            query = "SELECT * FROM c WHERE c.visitor_id = @visitor_id"
            params = [{"name": "@visitor_id", "value": self._user_id}]

            search_options = collation_options.to_sql_query_string("c")

            if search_options:
                query = f"{query} {search_options}"

            return await self._container.query_items_async(query, params)  # type: ignore[arg-type]
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to get access logs: {str(e)}", Service.DATABASE) from e

    async def create_access_log_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
        try:
            snapshots = SnapshotStore.create(self._user_id)

            snapshot_meta = await snapshots.get_snapshot_metadata_async(snapshot_id)

            new_log = SnapshotAccessLogDocument(
                visitor_id=self._user_id,
                snapshot_id=snapshot_id,
                snapshot_owner_id=snapshot_owner_id,
                snapshot_metadata=snapshot_meta,
            )

            return new_log
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to create access log: {str(e)}", Service.DATABASE) from e

    async def get_access_log_async(self, snapshot_id: str) -> SnapshotAccessLogDocument:
        item_id = make_access_log_item_id(snapshot_id, self._user_id)

        return await self._container.get_item_async(item_id, partition_key=self._user_id)

    async def get_existing_or_new_log_item_async(
        self, snapshot_id: str, snapshot_owner_id: str
    ) -> SnapshotAccessLogDocument:
        """
        Returns an already stored log item if it exists, otherwise, creates a new instance.

        **Note: This does create a new entry in the database!**
        """
        try:
            return await self.get_access_log_async(snapshot_id)
        except DatabaseAccessNotFoundError:
            return await self.create_access_log_async(snapshot_id=snapshot_id, snapshot_owner_id=snapshot_owner_id)
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to get or create access log: {str(e)}", Service.DATABASE) from e

    async def log_snapshot_visit_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
        timestamp = datetime.now(timezone.utc)
        try:
            log = await self.get_existing_or_new_log_item_async(snapshot_id, snapshot_owner_id)
            log.visits += 1
            log.last_visited_at = timestamp

            if not log.first_visited_at:
                log.first_visited_at = timestamp

            await self._container.update_item_async(item_id=log.id, partition_key=self._user_id, updated_item=log)

            return log
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to log snapshot visit: {str(e)}", Service.DATABASE) from e
