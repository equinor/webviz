import logging
from datetime import datetime, timezone
from typing import Any


from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.database_access_exceptions import DatabaseAccessError, DatabaseAccessNotFoundError
from primary.services.service_exceptions import Service, ServiceRequestError

from ..query_collation_options import QueryCollationOptions, SortDirection, Filter
from .types import SnapshotAccessLogSortBy
from .models import SnapshotAccessLogDocument
from .util import make_access_log_item_id

from .snapshot_access import SnapshotAccess


LOGGER = logging.getLogger(__name__)

LOWERCASED_FIELDS = [SnapshotAccessLogSortBy.TITLE]


class SnapshotLogAccess:
    DATABASE_NAME = "persistence"
    CONTAINER_NAME = "snapshot_access_logs"

    def __init__(self, user_id: str, container_access: ContainerAccess[SnapshotAccessLogDocument]):
        self._user_id = user_id
        self._container_access = container_access

    @classmethod
    def create(cls, user_id: str) -> "SnapshotLogAccess":
        container_access = ContainerAccess.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SnapshotAccessLogDocument)

        return cls(user_id, container_access)

    async def __aenter__(self) -> "SnapshotLogAccess":
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object | None
    ) -> None:
        # Clean up if needed (e.g., closing DB connections)
        await self._container_access.close_async()

    async def update_log_async(self, snapshot_id: str, changes: dict[str, Any]) -> None:
        try:
            existing = await self.get_access_log_async(snapshot_id)

            updated_item = existing.model_copy(update=changes)

            await self._container_access.update_item_async(snapshot_id, updated_item)
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to update access log: {str(e)}", Service.DATABASE) from e

    async def get_access_logs_for_user_async(
        self,
        sort_by: SnapshotAccessLogSortBy | None,
        sort_direction: SortDirection | None,
        limit: int | None,
        offset: int | None,
        filter_title: str | None,
        filter_updated_from: str | None,
        filter_updated_to: str | None,
    ) -> list[SnapshotAccessLogDocument]:
        try:
            sort_by_field = sort_by.value if sort_by else None
            sort_by_lowercase = sort_by in LOWERCASED_FIELDS

            filters: list[Filter] = [Filter("visitor_id", self._user_id)]

            if filter_title:
                filters.append(Filter("snapshot_metadata.title__lower", filter_title.lower(), "CONTAINS"))
            if filter_updated_from:
                filters.append(Filter("snapshot_metadata.updated_at", filter_updated_from, "MORE", "_from"))
            if filter_updated_to:
                filters.append(Filter("snapshot_metadata.updated_at", filter_updated_to, "LESS", "_to"))

            collation_options = QueryCollationOptions(
                sort_lowercase=sort_by_lowercase,
                sort_dir=sort_direction,
                sort_by=sort_by_field,
                offset=offset,
                limit=limit,
                filters=filters,
            )

            query = "SELECT * from c"

            params = collation_options.make_query_params()
            search_options = collation_options.to_sql_query_string()

            if search_options:
                query = f"{query} {search_options}"

            return await self._container_access.query_items_async(query, params)
        except DatabaseAccessError as err:
            raise ServiceRequestError(f"Failed to get access logs: {str(err)}", Service.DATABASE) from err

    async def create_access_log_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
        try:
            snapshots = SnapshotAccess.create(self._user_id)

            snapshot_meta = await snapshots.get_snapshot_metadata_async(snapshot_id, snapshot_owner_id)

            new_log = SnapshotAccessLogDocument(
                visitor_id=self._user_id,
                snapshot_id=snapshot_id,
                snapshot_owner_id=snapshot_owner_id,
                snapshot_metadata=snapshot_meta,
            )

            _inserted_id = await self._container_access.insert_item_async(new_log)

            return new_log
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to create access log: {str(e)}", Service.DATABASE) from e

    async def get_access_log_async(self, snapshot_id: str) -> SnapshotAccessLogDocument:
        item_id = make_access_log_item_id(snapshot_id, self._user_id)

        return await self._container_access.get_item_async(item_id, partition_key=self._user_id)

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

            await self._container_access.update_item_async(log.id, log)

            return log
        except DatabaseAccessError as e:
            raise ServiceRequestError(f"Failed to log snapshot visit: {str(e)}", Service.DATABASE) from e
