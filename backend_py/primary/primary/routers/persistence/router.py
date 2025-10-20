import html
import logging
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse

from primary.persistence.session_store.session_store import SessionStore
from primary.persistence.session_store.types import NewSession, SessionSortBy, SessionUpdate
from primary.persistence.tasks.mark_logs_deleted_task import mark_logs_deleted_task
from primary.persistence.snapshot_store.snapshot_store import SnapshotStore
from primary.persistence.snapshot_store.snapshot_access_log_store import SnapshotAccessLogStore
from primary.persistence.cosmosdb.query_collation_options import QueryCollationOptions, SortDirection
from primary.persistence.snapshot_store.types import (
    NewSnapshot,
    SnapshotSortBy,
    SnapshotAccessLogSortBy,
)
from primary.middleware.add_browser_cache import no_cache


from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from .converters import (
    to_api_session_metadata,
    to_api_session_metadata_summary,
    to_api_session_record,
    to_api_snapshot,
    to_api_snapshot_access_log,
    to_api_snapshot_metadata,
    to_api_snapshot_metadata_summary,
)


from . import schemas

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sessions", response_model=List[schemas.SessionMetadataWithId])
@no_cache
async def get_sessions_metadata(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sort_by: Optional[SessionSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction: 'asc' or 'desc'"),
    limit: int = Query(10, ge=1, le=100, description="Limit the number of results"),
    page: int = Query(0, ge=0),
) -> list[schemas.SessionMetadataWithId]:
    access = SessionStore.create(user.get_user_id())
    async with access:
        items = await access.get_filtered_sessions_metadata_for_user_async(
            sort_by=sort_by,
            sort_direction=sort_direction,
            limit=limit,
            offset=limit * page,
        )

        return [to_api_session_metadata_summary(item) for item in items]


@router.get("/sessions/{session_id}", response_model=schemas.SessionDocument)
@no_cache
async def get_session(
    session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SessionDocument:
    access = SessionStore.create(user.get_user_id())
    async with access:
        session = await access.get_session_by_id_async(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return to_api_session_record(session)


@router.get("/sessions/metadata/{session_id}", response_model=schemas.SessionMetadata)
@no_cache
async def get_session_metadata(
    session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SessionMetadata:
    access = SessionStore.create(user.get_user_id())
    async with access:
        metadata = await access.get_session_metadata_async(session_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Session metadata not found")
        return to_api_session_metadata(metadata)


@router.post("/sessions", response_model=str)
async def create_session(
    session: NewSession, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    access = SessionStore.create(user.get_user_id())
    async with access:
        session_id = await access.insert_session_async(session)
        return session_id


@router.put("/sessions/{session_id}", description="Updates a session object. Allows for partial update objects")
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.SessionDocument:
    access = SessionStore.create(user.get_user_id())
    async with access:
        updated_session = await access.update_session_async(session_id, session_update)
        return to_api_session_record(updated_session)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)) -> None:
    access = SessionStore.create(user.get_user_id())
    async with access:
        await access.delete_session_async(session_id)


@router.get("/recent_snapshots", response_model=list[schemas.SnapshotAccessLog])
async def get_recent_snapshots(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sort_by: Optional[SnapshotAccessLogSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Limit the number of results"),
    offset: Optional[int] = Query(None, ge=0, description="The offset of the results"),
) -> list[schemas.SnapshotAccessLog]:
    async with SnapshotAccessLogStore.create(user.get_user_id()) as log_access:
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
    access = SnapshotStore.create(user.get_user_id())
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
    snapshot_access = SnapshotStore.create(user.get_user_id())
    log_access = SnapshotAccessLogStore.create(user_id=user.get_user_id())

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
    access = SnapshotStore.create(user.get_user_id())
    async with access:
        metadata = await access.get_snapshot_metadata_async(snapshot_id)
        return to_api_snapshot_metadata(metadata)


@router.post("/snapshots", response_model=str)
async def create_snapshot(
    session: NewSnapshot, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    snapshot_access = SnapshotStore.create(user.get_user_id())
    log_access = SnapshotAccessLogStore.create(user.get_user_id())

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
    snapshot_access = SnapshotStore.create(user.get_user_id())
    async with snapshot_access:
        await snapshot_access.delete_snapshot_async(snapshot_id)

    # This is the fastest solution for the moment. As we are expecting <= 150 logs per snapshot
    # and consistency is not critical, we can afford to do this in the background and without
    # a safety net. We can later consider adding this to a queue for better reliability.
    background_tasks.add_task(mark_logs_deleted_task, snapshot_id=snapshot_id)
