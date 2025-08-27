import asyncio
import logging
from datetime import datetime, timezone
from typing import Any


from primary.services.database_access.container_access import ContainerAccess
from primary.services.service_exceptions import ServiceRequestError

from ..query_collation_options import QueryCollationOptions
from .models import SnapshotAccessLogDocument
from .util import make_access_log_item_id

from .snapshot_access import SnapshotAccess


LOGGER = logging.getLogger(__name__)


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
        existing = await self.get_access_log_async(snapshot_id)

        updated_item = existing.model_copy(update=changes)

        await self._container_access.update_item_async(snapshot_id, updated_item)

    async def get_access_logs_for_user_async(
        self, collation_options: QueryCollationOptions
    ) -> list[SnapshotAccessLogDocument]:
        query = "SELECT * FROM c WHERE c.visitor_id = @visitor_id"
        params = [{"name": "@visitor_id", "value": self._user_id}]

        search_options = collation_options.to_sql_query_string("c")

        if search_options:
            query = f"{query} {search_options}"

        return await self._container_access.query_items_async(query, params)  # type: ignore[arg-type]

    async def create_access_log_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
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
        except ServiceRequestError:
            return await self.create_access_log_async(snapshot_id=snapshot_id, snapshot_owner_id=snapshot_owner_id)

    async def log_snapshot_visit_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
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

    async def mark_snapshot_as_deleted_async(self, snapshot_id: str) -> None:
        try:
            # Fetch only what we need: id + partition key
            query = (
                "SELECT c.id, c.visitor_id "
                "FROM c "
                "WHERE c.snapshot_id = @sid "
                "AND (NOT IS_DEFINED(c.snapshot_deleted) OR c.snapshot_deleted != true)"
            )
            params = [{"name": "@sid", "value": snapshot_id}]
            candidates: list[dict[str, Any]] = await self._container_access.query_items_async(query, params)  # type: ignore

            if not candidates:
                LOGGER.info(f"No access logs found for snapshot '{snapshot_id}'. Nothing to mark as deleted.")
                return

            ops = [
                {"op": "set", "path": "/snapshot_deleted", "value": True},
            ]

            # Concurrency control to avoid RU spikes - acting as a bouncer to only allow N concurrent requests
            semaphore = asyncio.Semaphore(32)  # we have to fine-tune based on RU budget

            async def _patch_one(item: dict[str, Any]) -> None:
                async with semaphore:
                    try:
                        await self._container_access.patch_item_async(
                            item_id=item["id"],
                            partition_key=item["visitor_id"],
                            operations=ops,
                        )
                    except ServiceRequestError as e:
                        LOGGER.warning("Failed to patch log id=%s pk=%s: %s", item["id"], item["visitor_id"], e)

            await asyncio.gather(*(_patch_one(it) for it in candidates))
        except ServiceRequestError:  # Check error handling!
            # If there's no log, we don't need to mark it as deleted
            LOGGER.info(f"No access logs found for snapshot '{snapshot_id}'. Nothing to mark as deleted.")
            return
