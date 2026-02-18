import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List

from webviz_services.service_exceptions import ServiceRequestError

from primary.persistence.persistence_stores import PersistenceStoresSingleton
from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.snapshot_store.documents import SnapshotAccessLogDocument

LOGGER = logging.getLogger(__name__)

_DATABASE_NAME = "persistence"
_CONTAINER_NAME = "snapshot_access_logs"

# To avoid overwhelming the database with too many concurrent PATCH operations
# (which can lead to throttling or Request Unit (RU) spikes), we limit concurrency.
_MAX_CONCURRENT_PATCH_OPS = 32


async def mark_logs_deleted_task(snapshot_id: str, retry_count: int = 0, max_retries: int = 3) -> None:
    """
    Marks all access-log docs for the given snapshot_id as deleted (PATCH /snapshot_deleted = true).
    Runs with bounded concurrency and is idempotent/safe to re-run.

    Args:
        snapshot_id: The ID of the snapshot whose logs should be marked as deleted
        retry_count: Current retry attempt (for internal use)
        max_retries: Maximum number of retry attempts
    """
    persistence_stores = PersistenceStoresSingleton.get_instance()
    container: CosmosContainer[SnapshotAccessLogDocument] = persistence_stores.get_container(
        _DATABASE_NAME, _CONTAINER_NAME, SnapshotAccessLogDocument
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
        sem = asyncio.Semaphore(_MAX_CONCURRENT_PATCH_OPS)

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

        # If there were failures and we haven't exceeded max retries, schedule a retry
        if fail > 0 and retry_count < max_retries:
            retry_delay = 2**retry_count  # Exponential backoff: 1s, 2s, 4s
            LOGGER.warning(
                "Scheduling retry %d/%d for snapshot '%s' in %d seconds (%d failures).",
                retry_count + 1,
                max_retries,
                snapshot_id,
                retry_delay,
                fail,
            )
            await asyncio.sleep(retry_delay)
            await mark_logs_deleted_task(snapshot_id, retry_count + 1, max_retries)
        elif fail > 0:
            LOGGER.error(
                "Failed to mark all logs deleted for snapshot '%s' after %d retries. %d logs remain unmarked.",
                snapshot_id,
                max_retries,
                fail,
            )

    except Exception as e:
        LOGGER.error("Unexpected error in mark_logs_deleted_task for snapshot '%s': %s", snapshot_id, e)
        # If this is a recoverable error and we haven't exceeded retries, try again
        if retry_count < max_retries:
            retry_delay = 2**retry_count  # Exponential backoff: 1s, 2s, 4s
            LOGGER.warning("Retrying mark_logs_deleted_task for snapshot '%s' in %d seconds.", snapshot_id, retry_delay)
            await asyncio.sleep(retry_delay)
            await mark_logs_deleted_task(snapshot_id, retry_count + 1, max_retries)
        else:
            LOGGER.error(
                "Failed to complete mark_logs_deleted_task for snapshot '%s' after %d retries.",
                snapshot_id,
                max_retries,
            )
            raise
