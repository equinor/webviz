import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from primary.services.database_access.snapshot_access.types import (
    NewSnapshot,
    SnapshotSortBy,
    SnapshotAccessLogSortBy,
)
from primary.middleware.add_browser_cache import no_cache
from primary.services.database_access.snapshot_access.snapshot_access import SnapshotAccess
from primary.services.database_access.snapshot_access.snapshot_log_access import SnapshotLogAccess
from primary.services.database_access.query_collation_options import SortDirection
from primary.services.database_access.workers.mark_logs_deleted import mark_logs_deleted_worker


from primary.auth.auth_helper import AuthHelper, AuthenticatedUser


from . import schemas
from .converters import (
    to_api_snapshot,
    to_api_snapshot_metadata,
    to_api_snapshot_metadata_summary,
    to_api_access_log_index_page,
)


LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/visited_snapshots", response_model=schemas.SnapshotAccessLogIndexPage)
async def get_visited_snapshots(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    # ! Must be named "cursor" or "page" to make hey-api generate infinite-queries
    # ! When we've updated to the latest hey-api version, we can change this to something custom
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    limit: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
    sort_by: Optional[SnapshotAccessLogSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    # ? Is this becoming too many args? Should we make a post-search endpoint instead?
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_updated_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_updated_to: Optional[str] = Query(None, description="Filter results by date"),
) -> schemas.SnapshotAccessLogIndexPage:
    async with SnapshotLogAccess.create(user.get_user_id()) as log_access:
        (items, cont_token) = await log_access.get_user_access_log_by_page_async(
            continuation_token=cursor,
            page_size=limit,
            sort_by=sort_by,
            sort_direction=sort_direction,
            filter_title=filter_title,
            filter_updated_from=filter_updated_from,
            filter_updated_to=filter_updated_to,
        )

        return to_api_access_log_index_page(items, cont_token)


@router.get("/snapshots", response_model=List[schemas.SnapshotMetadata])
@no_cache
async def get_snapshots_metadata(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sort_by: Optional[SnapshotSortBy] = Query(SnapshotSortBy.UPDATED_AT, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.DESC, description="Sort direction: 'asc' or 'desc'"),
    limit: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
) -> List[schemas.SnapshotMetadata]:
    access = SnapshotAccess.create(user.get_user_id())
    async with access:
        items = await access.get_filtered_snapshots_metadata_for_user_async(
            sort_by=sort_by, sort_direction=sort_direction, limit=limit, offset=0
        )
        return [to_api_snapshot_metadata_summary(item) for item in items]


@router.get("/snapshots/{snapshot_id}", response_model=schemas.Snapshot)
@no_cache
async def get_snapshot(
    snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.Snapshot:
    snapshot_access = SnapshotAccess.create(user.get_user_id())
    log_access = SnapshotLogAccess.create(user_id=user.get_user_id())

    async with snapshot_access, log_access:
        snapshot = await snapshot_access.get_snapshot_by_id_async(snapshot_id)
        # Should we clear the log if a snapshot was not found? This could mean that the snapshot was
        # deleted but deletion of logs has failed
        await log_access.log_snapshot_visit_async(snapshot_id, snapshot.owner_id)
        return to_api_snapshot(snapshot)


@router.get("/snapshots/metadata/{snapshot_id}", response_model=schemas.SnapshotMetadata)
@no_cache
async def get_snapshot_metadata(
    snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SnapshotMetadata:
    access = SnapshotAccess.create(user.get_user_id())
    async with access:
        metadata = await access.get_snapshot_metadata_async(snapshot_id)
        return to_api_snapshot_metadata(metadata)


@router.post("/snapshots", response_model=str)
async def create_snapshot(
    session: NewSnapshot, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    snapshot_access = SnapshotAccess.create(user.get_user_id())
    log_access = SnapshotLogAccess.create(user.get_user_id())

    async with snapshot_access, log_access:
        snapshot_id = await snapshot_access.insert_snapshot_async(session)

        # We count snapshot creation as implicit visit. This also makes it so we can get recently created ones alongside other shared screenshots
        await log_access.log_snapshot_visit_async(snapshot_id=snapshot_id, snapshot_owner_id=user.get_user_id())
        return snapshot_id


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    snapshot_access = SnapshotAccess.create(user.get_user_id())
    async with snapshot_access:
        await snapshot_access.delete_snapshot_async(snapshot_id)

    # This is the fastest solution for the moment. As we are expecting <= 150 logs per snapshot
    # and consistency is not critical, we can afford to do this in the background and without
    # a safety net. We can later consider adding this to a queue for better reliability.
    background_tasks.add_task(mark_logs_deleted_worker, snapshot_id=snapshot_id)
