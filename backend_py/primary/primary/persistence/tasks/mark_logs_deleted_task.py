import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Sequence

from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.snapshot_store.documents import SnapshotAccessLogDocument
from primary.services.service_exceptions import ServiceRequestError

LOGGER = logging.getLogger(__name__)

DATABASE_NAME = "persistence"
CONTAINER_NAME = "snapshot_access_logs"

# To avoid overwhelming the database with too many concurrent PATCH operations
# (which can lead to throttling or Request Unit (RU) spikes), we limit concurrency.
MAX_CONCURRENT_PATCH_OPS = 32


async def mark_logs_deleted_task(snapshot_id: str) -> None:
    """
    Marks all access-log docs for the given snapshot_id as deleted (PATCH /snapshot_deleted = true).
    Runs with bounded concurrency and is idempotent/safe to re-run.
    """
    container: CosmosContainer[SnapshotAccessLogDocument] = CosmosContainer.create(
        DATABASE_NAME, CONTAINER_NAME, SnapshotAccessLogDocument
    )

    try:
        query = (
            "SELECT c.id, c.visitor_id "
            "FROM c "
            "WHERE c.snapshot_id = @sid "
            "AND (NOT IS_DEFINED(c.snapshot_deleted) OR c.snapshot_deleted != true)"
        )
        params = [{"name": "@sid", "value": snapshot_id}]

        rows: List[Dict[str, Any]] = await container.query_projection_async(query, params)

        if not rows:
            LOGGER.info("No snapshot_access_logs to update for snapshot '%s'.", snapshot_id)
            return

        deleted_at = datetime.now(timezone.utc).isoformat()

        operations: List[dict] = [
            {"op": "set", "path": "/snapshot_deleted", "value": True},
            {"op": "set", "path": "/snapshot_deleted_at", "value": deleted_at},
        ]

        # Limit concurrency to avoid RU spikes/throttling
        sem = asyncio.Semaphore(MAX_CONCURRENT_PATCH_OPS)

        async def _patch_one(rec: Dict[str, Any]) -> bool:
            async with sem:
                try:
                    await container.patch_item_async(
                        item_id=rec["id"],
                        partition_key=rec["visitor_id"],  # /visitor_id is the PK
                        patch_operations=operations,
                    )
                    return True
                except asyncio.CancelledError:
                    # always re-raise cancellation so shutdowns are graceful
                    raise
                except ServiceRequestError as e:
                    LOGGER.warning("PATCH failed for log id=%s pk=%s: %s", rec.get("id"), rec.get("visitor_id"), e)
                    # Do not re-raise - we want to continue with other items
                    return False

        results = await asyncio.gather(*(_patch_one(r) for r in rows))
        success = sum(1 for ok in results if ok)
        fail = len(rows) - success
        LOGGER.info(
            "Marked %d/%d access-log docs deleted for snapshot '%s' (failures=%d).",
            success,
            len(rows),
            snapshot_id,
            fail,
        )

    finally:
        await container.close_async()
