import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List

from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.snapshot_access.models import SnapshotAccessLogDocument
from primary.services.service_exceptions import ServiceRequestError

LOGGER = logging.getLogger(__name__)

DATABASE_NAME = "persistence"
CONTAINER_NAME = "snapshot_access_logs"


async def mark_logs_deleted_worker(snapshot_id: str) -> None:
    """
    Marks all access-log docs for the given snapshot_id as deleted (PATCH /snapshot_deleted = true).
    Runs with bounded concurrency and is idempotent/safe to re-run.
    """
    container_access: ContainerAccess[SnapshotAccessLogDocument] = ContainerAccess.create(
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

        rows: List[Dict[str, Any]] = await container_access.query_projection_async(
            query, params, enable_cross_partition_query=True
        )

        if not rows:
            LOGGER.info("No snapshot_access_logs to update for snapshot '%s'.", snapshot_id)
            return

        deleted_at = datetime.now(timezone.utc).isoformat()

        operations = [
            {"op": "set", "path": "/snapshot_deleted", "value": True},
            {"op": "set", "path": "/deleted_at", "value": deleted_at},
        ]

        # Limit concurrency to avoid RU spikes/throttling
        sem = asyncio.Semaphore(32)

        success = 0
        fail = 0

        async def _patch_one(rec: Dict[str, Any]) -> None:
            async with sem:
                try:
                    await container_access.patch_item_async(
                        item_id=rec["id"],
                        partition_key=rec["visitor_id"],  # /visitor_id is the PK
                        patch_operations=operations,
                    )
                    success += 1
                except asyncio.CancelledError:
                    # always re-raise cancellation so shutdowns are graceful
                    raise
                except ServiceRequestError as e:
                    fail += 1
                    LOGGER.warning("PATCH failed for log id=%s pk=%s: %s", rec.get("id"), rec.get("visitor_id"), e)
                    # Do not re-raise - we want to continue with other items

        await asyncio.gather(*(_patch_one(r) for r in rows))
        LOGGER.info(
            "Marked %d/%d access-log docs deleted for snapshot '%s' (failures=%d).",
            success,
            len(rows),
            snapshot_id,
            fail,
        )

    finally:
        await container_access.close_async()
