import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from primary.persistence.session_store.session_store import SessionStore
from primary.persistence.session_store.types import SessionSortBy
from primary.persistence.tasks.mark_logs_deleted_task import mark_logs_deleted_task
from primary.persistence.snapshot_store.snapshot_store import SnapshotStore
from primary.persistence.snapshot_store.snapshot_access_log_store import SnapshotAccessLogStore
from primary.persistence.cosmosdb.query_collation_options import Filter, SortDirection
from primary.persistence.snapshot_store.types import (
    SnapshotAccessLogSortBy,
    SnapshotSortBy,
)
from primary.middleware.add_browser_cache import no_cache


from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from .converters import (
    from_api_new_session,
    from_api_new_snapshot,
    from_api_session_update,
    to_api_session_metadata,
    to_api_session,
    to_api_snapshot,
    to_api_snapshot_access_log,
    to_api_snapshot_metadata,
)


from . import schemas

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sessions")
@no_cache
async def get_sessions_metadata(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    sort_by: Optional[SessionSortBy] = Query(None, description="Field to sort by (e.g., 'metadata.title')"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction: 'asc' or 'desc'"),
    sort_lowercase: bool = Query(False, description="Use case-insensitive sorting"),
    page_size: int = Query(10, ge=1, le=100, description="Limit the number of results"),
    # ? Is this becoming too many args? Should we make a post-search endpoint instead?
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_updated_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_updated_to: Optional[str] = Query(None, description="Filter results by date"),
) -> schemas.Page[schemas.SessionMetadata]:
    """
    Get session metadata with pagination and sorting.

    Returns a paginated response with items and continuation token.
    """
    session_store = SessionStore.create(user.get_user_id())
    async with session_store:
        filters = []
        if filter_title:
            filters.append(Filter("metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_updated_from:
            filters.append(Filter("metadata.updated_at", filter_updated_from, "MORE", "_from"))
        if filter_updated_to:
            filters.append(Filter("metadata.updated_at", filter_updated_to, "LESS", "_to"))

        items, token = await session_store.get_many_async(
            page_token=cursor,
            page_size=page_size,
            sort_by=sort_by,
            sort_direction=sort_direction,
            sort_lowercase=sort_lowercase,
            filters=filters if filters else None,
        )

        return schemas.Page(items=[to_api_session_metadata(item) for item in items], continuation_token=token)


@router.get("/sessions/{session_id}")
@no_cache
async def get_session(
    session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.Session:
    session_store = SessionStore.create(user.get_user_id())
    async with session_store:
        session = await session_store.get_async(session_id)
        return to_api_session(session)


@router.get("/sessions/metadata/{session_id}")
@no_cache
async def get_session_metadata(
    session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SessionMetadata:
    session_store = SessionStore.create(user.get_user_id())
    async with session_store:
        session = await session_store.get_async(session_id)
        return to_api_session_metadata(session)


@router.post("/sessions")
async def create_session(
    session: schemas.NewSession, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    session_store = SessionStore.create(user.get_user_id())
    async with session_store:
        session_id = await session_store.create_async(from_api_new_session(session))
        return session_id


@router.put("/sessions/{session_id}", description="Updates a session object. Allows for partial update objects")
async def update_session(
    session_id: str,
    session_update: schemas.SessionUpdate,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.Session:
    session_store = SessionStore.create(user.get_user_id())
    async with session_store:
        updated_session = await session_store.update_async(session_id, from_api_session_update(session_update))
        return to_api_session(updated_session)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)) -> None:
    session_store = SessionStore.create(user.get_user_id())
    async with session_store:
        await session_store.delete_async(session_id)


@router.get("/visited_snapshots")
# pylint: disable=too-many-arguments
async def get_visited_snapshots(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    # ! Must be named "cursor" or "page" to make hey-api generate infinite-queries
    # ! When we've updated to the latest hey-api version, we can change this to something custom
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    page_size: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
    sort_by: Optional[SnapshotAccessLogSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    sort_lowercase: bool = Query(False, description="Use case-insensitive sorting"),
    # ? Is this becoming too many args? Should we make a post-search endpoint instead?
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_created_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_created_to: Optional[str] = Query(None, description="Filter results by date"),
    filter_last_visited_from: Optional[str] = Query(None, description="Filter results by date of last visit"),
    filter_last_visited_to: Optional[str] = Query(None, description="Filter results by date of last visit"),
) -> schemas.Page[schemas.SnapshotAccessLog]:

    log_store = SnapshotAccessLogStore.create(user.get_user_id())

    async with log_store:
        filters = []
        if filter_title:
            filters.append(Filter("snapshot_metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_created_from:
            filters.append(Filter("snapshot_metadata.created_at", filter_created_from, "MORE", "_from"))
        if filter_created_to:
            filters.append(Filter("snapshot_metadata.created_at", filter_created_to, "LESS", "_to"))
        if filter_last_visited_from:
            filters.append(Filter("last_visited_at", filter_last_visited_from, "MORE", "_from"))
        if filter_last_visited_to:
            filters.append(Filter("last_visited_at", filter_last_visited_to, "LESS", "_to"))

        (items, cont_token) = await log_store.get_many_for_user_async(
            page_token=cursor,
            page_size=page_size,
            sort_by=sort_by,
            sort_direction=sort_direction,
            sort_lowercase=sort_lowercase,
            filters=filters if filters else None,
        )

        return schemas.Page(items=[to_api_snapshot_access_log(item) for item in items], continuation_token=cont_token)


@router.get("/snapshots")
@no_cache
async def get_snapshots_metadata(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    # ! Must be named "cursor" or "page" to make hey-api generate infinite-queries
    # ! When we've updated to the latest hey-api version, we can change this to something custom
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    page_size: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
    sort_by: Optional[SnapshotSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    sort_lowercase: bool = Query(False, description="Use case-insensitive sorting"),
    # ? Is this becoming too many args? Should we make a post-search endpoint instead?
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_created_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_created_to: Optional[str] = Query(None, description="Filter results by date"),
) -> schemas.Page[schemas.SnapshotMetadata]:
    snapshot_store = SnapshotStore.create(user.get_user_id())
    async with snapshot_store:
        filters = []
        if filter_title:
            filters.append(Filter("metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_created_from:
            filters.append(Filter("metadata.created_at", filter_created_from, "MORE", "_from"))
        if filter_created_to:
            filters.append(Filter("metadata.created_at", filter_created_to, "LESS", "_to"))

        items, cont_token = await snapshot_store.get_many_async(
            page_token=cursor,
            page_size=page_size,
            sort_by=sort_by,
            sort_direction=sort_direction,
            sort_lowercase=sort_lowercase,
            filters=filters if filters else None,
        )
        return schemas.Page(items=[to_api_snapshot_metadata(item) for item in items], continuation_token=cont_token)


@router.get("/snapshots/{snapshot_id}")
@no_cache
async def get_snapshot(
    snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.Snapshot:
    snapshot_store = SnapshotStore.create(user.get_user_id())
    log_store = SnapshotAccessLogStore.create(user_id=user.get_user_id())

    async with snapshot_store, log_store:
        snapshot = await snapshot_store.get_async(snapshot_id)
        # Should we clear the log if a snapshot was not found? This could mean that the snapshot was
        # deleted but deletion of logs has failed
        await log_store.log_snapshot_visit_async(snapshot_id, snapshot.owner_id)
        return to_api_snapshot(snapshot)


@router.get("/snapshots/metadata/{snapshot_id}")
@no_cache
async def get_snapshot_metadata(
    snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SnapshotMetadata:
    snapshot_store = SnapshotStore.create(user.get_user_id())
    async with snapshot_store:
        snapshot = await snapshot_store.get_async(snapshot_id)
        return to_api_snapshot_metadata(snapshot)


@router.post("/snapshots")
async def create_snapshot(
    snapshot: schemas.NewSnapshot, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    snapshot_access = SnapshotStore.create(user.get_user_id())
    log_store = SnapshotAccessLogStore.create(user.get_user_id())

    async with snapshot_access, log_store:
        snapshot_id = await snapshot_access.create_async(from_api_new_snapshot(snapshot))

        # We count snapshot creation as implicit visit. This also makes it so we can get recently created ones alongside other shared screenshots
        await log_store.log_snapshot_visit_async(snapshot_id=snapshot_id, snapshot_owner_id=user.get_user_id())
        return snapshot_id


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    snapshot_store = SnapshotStore.create(user.get_user_id())
    async with snapshot_store:
        await snapshot_store.delete_async(snapshot_id)

    # This is the fastest solution for the moment. As we are expecting <= 150 logs per snapshot
    # and consistency is not critical, we can afford to do this in the background and without
    # a safety net. We can later consider adding this to a queue for better reliability.
    background_tasks.add_task(mark_logs_deleted_task, snapshot_id=snapshot_id)
