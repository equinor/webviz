import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.services.database_access.snapshot_access.types import (
    NewSnapshot,
    SnapshotUpdate,
    SortBy,
    SortDirection,
)
from primary.middleware.add_browser_cache import no_cache
from primary.services.snapshot_access.snapshot_access import SnapshotAccess
from primary.services.snapshot_access.snapshot_logs_access import SnapshotLogsAccess
from primary.services.snapshot_access.query_collation_options import QueryCollationOptions


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
    sort_by: Optional[SortBy] = Query(SortBy.LAST_VISIT, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.DESC, description="Sort direction: 'asc' or 'desc'"),
    limit: Optional[int] = Query(5, ge=1, le=100, description="Limit the number of results"),
    offset: Optional[int] = Query(0, ge=0, description="The offset of the results"),
) -> list[schemas.SnapshotAccessLog]:
    async with (
        SnapshotAccess.create(user.get_user_id()) as snapshot_access,
        SnapshotLogsAccess.create(user.get_user_id()) as log_access,
    ):
        collation_options = QueryCollationOptions(sort_by=sort_by, sort_dir=sort_direction, limit=limit, offset=offset)

        recent_logs = await log_access.get_access_logs_for_user_async(collation_options)

        payload: list[schemas.SnapshotAccessLog] = []

        for log in recent_logs:
            metadata = await snapshot_access.get_snapshot_metadata_async(log.snapshot_id, log.snapshot_owner_id)

            payload.append(to_api_snapshot_access_log(log, metadata))

        return payload


@router.get("/snapshots", response_model=List[schemas.SnapshotMetadata])
@no_cache
async def get_snapshots_metadata(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sort_by: Optional[SortBy] = Query(SortBy.LAST_VISIT, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.DESC, description="Sort direction: 'asc' or 'desc'"),
    limit: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
) -> List[schemas.SnapshotMetadata]:
    access = SnapshotAccess.create(user.get_user_id())
    async with access:
        items = await access.get_filtered_snapshots_metadata_for_user_async(
            sort_by=sort_by, sort_direction=sort_direction, limit=limit
        )
        return [to_api_snapshot_metadata_summary(item) for item in items]


@router.get("/snapshots/{snapshot_id}", response_model=schemas.Snapshot)
@no_cache
async def get_snapshot(
    snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.Snapshot:
    access = SnapshotAccess.create(user.get_user_id())
    logs_access = SnapshotLogsAccess.create(user_id=user.get_user_id())

    async with access, logs_access:
        snapshot = await access.get_snapshot_by_id_async(snapshot_id)
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")

        await logs_access.log_snapshot_visit_async(snapshot_id, snapshot.owner_id)

        return to_api_snapshot(snapshot)


@router.get("/snapshots/metadata/{snapshot_id}", response_model=schemas.SnapshotMetadata)
@no_cache
async def get_snapshot_metadata(snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
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
    access = SnapshotAccess.create(user.get_user_id())
    logs_access = SnapshotLogsAccess.create(user.get_user_id())

    async with access, logs_access:
        snapshot_id = await access.insert_snapshot_async(session)

        # We count snapshot creation as implicit visit. This also makes it so
        await logs_access.log_snapshot_visit_async(snapshot_id=snapshot_id, snapshot_owner_id=user.get_user_id())
        return snapshot_id


@router.put("/snapshots/{snapshot_id}")
async def update_snapshot(
    snapshot_id: str,
    snapshot_update: SnapshotUpdate,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    access = SnapshotAccess.create(user.get_user_id())
    async with access:
        await access.update_snapshot_metadata_async(snapshot_id, snapshot_update)


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = SnapshotAccess.create(user.get_user_id())
    async with access:
        await access.delete_snapshot_async(snapshot_id)
