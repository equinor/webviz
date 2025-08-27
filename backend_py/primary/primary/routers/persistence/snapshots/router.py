import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.services.database_access.snapshot_access.types import (
    NewSnapshot,
    SnapshotSortBy,
    SnapshotAccessLogSortBy,
)
from primary.middleware.add_browser_cache import no_cache
from primary.services.database_access.snapshot_access.snapshot_access import SnapshotAccess
from primary.services.database_access.snapshot_access.snapshot_log_access import SnapshotLogAccess
from primary.services.database_access.query_collation_options import QueryCollationOptions, SortDirection


from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from primary.routers.persistence.snapshots.converters import (
    to_api_snapshot,
    to_api_snapshot_access_log,
    to_api_snapshot_metadata,
    to_api_snapshot_metadata_summary,
)


from . import schemas

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recent_snapshots", response_model=list[schemas.SnapshotAccessLog])
async def get_recent_snapshots(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sort_by: Optional[SnapshotAccessLogSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Limit the number of results"),
    offset: Optional[int] = Query(None, ge=0, description="The offset of the results"),
) -> list[schemas.SnapshotAccessLog]:
    async with SnapshotLogAccess.create(user.get_user_id()) as log_access:
        collation_options = QueryCollationOptions(sort_by=sort_by, sort_dir=sort_direction, limit=limit, offset=offset)

        recent_logs = await log_access.get_access_logs_for_user_async(collation_options)

        return [to_api_snapshot_access_log(log) for log in recent_logs]


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
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")

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
        if not metadata:
            raise HTTPException(status_code=404, detail="Session metadata not found")
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
    snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> None:
    snapshot_access = SnapshotAccess.create(user.get_user_id())
    async with snapshot_access:
        await snapshot_access.delete_snapshot_async(snapshot_id)

    log_access = SnapshotLogAccess.create(user.get_user_id())
    async with log_access:
        # Might want to making this a background task so we don't block on it as it is not critical
        # for the user to have this done immediately. It could also be done in a queue if we
        # want to improve responsiveness.
        await log_access.mark_snapshot_as_deleted_async(snapshot_id)
