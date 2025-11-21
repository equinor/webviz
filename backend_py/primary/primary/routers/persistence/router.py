import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query

from primary.persistence.session_store.documents import SessionDocument
from primary.persistence.snapshot_store.documents import SnapshotAccessLogDocument, SnapshotDocument
from primary.persistence.cosmosdb.filter_factory import FilterFactory
from primary.persistence.session_store.session_store import SessionStore
from primary.persistence.session_store.types import SessionSortBy
from primary.persistence.tasks.mark_logs_deleted_task import mark_logs_deleted_task
from primary.persistence.snapshot_store.snapshot_store import SnapshotStore
from primary.persistence.snapshot_store.snapshot_access_log_store import SnapshotAccessLogStore
from primary.persistence.cosmosdb.query_collation_options import SortDirection
from primary.persistence.snapshot_store.types import (
    SnapshotAccessLogSortBy,
    SnapshotSortBy,
)
from primary.middleware.add_browser_cache import no_cache


from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from .converters import (
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
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    sort_by: Optional[SessionSortBy] = Query(None, description="Field to sort by (e.g., 'metadata.title')"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    sort_lowercase: bool = Query(False, description="Use case-insensitive sorting"),
    page_size: int = Query(10, ge=1, le=100, description="Limit the number of results"),
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_updated_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_updated_to: Optional[str] = Query(None, description="Filter results by date"),
) -> schemas.Page[schemas.SessionMetadata]:
    """
    Get a paginated list of session metadata for the authenticated user.

    This endpoint returns session metadata (without content) with support for:
    - **Pagination**: Use the continuation token to fetch subsequent pages
    - **Sorting**: Sort by various fields in ascending or descending order
    - **Case-insensitive sorting**: Optional lowercase sorting for text fields
    - **Filtering**: Filter by title and date ranges

    The response includes a continuation token for fetching the next page of results.
    """
    session_store = SessionStore.create_instance(authenticated_user.get_user_id())
    async with session_store:
        filter_factory = FilterFactory(SessionDocument)
        filters = []
        if filter_title:
            filters.append(filter_factory.create("metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_updated_from:
            filters.append(filter_factory.create("metadata.updated_at", filter_updated_from, "MORE", "_from"))
        if filter_updated_to:
            filters.append(filter_factory.create("metadata.updated_at", filter_updated_to, "LESS", "_to"))

        items, token = await session_store.get_many_async(
            page_token=cursor,
            page_size=page_size,
            sort_by=sort_by,
            sort_direction=sort_direction,
            sort_lowercase=sort_lowercase,
            filters=filters if filters else None,
        )

        return schemas.Page(items=[to_api_session_metadata(item) for item in items], pageToken=token)


@router.get("/sessions/{session_id}")
@no_cache
async def get_session(
    session_id: str, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.Session:
    """
    Retrieve a complete session by its ID.

    Returns the full session document including:
    - Session metadata (title, description, timestamps, version, etc.)
    - Complete session content

    Only the session owner can access this endpoint.
    """
    session_store = SessionStore.create_instance(authenticated_user.get_user_id())
    async with session_store:
        session = await session_store.get_async(session_id)
        return to_api_session(session)


@router.get("/sessions/metadata/{session_id}")
@no_cache
async def get_session_metadata(
    session_id: str, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SessionMetadata:
    """
    Retrieve only the metadata for a specific session.

    Returns session metadata without the content, useful for:
    - Listing sessions with details
    - Checking version or timestamps
    - Lightweight operations that don't need full content

    Only the session owner can access this endpoint.
    """
    session_store = SessionStore.create_instance(authenticated_user.get_user_id())
    async with session_store:
        session = await session_store.get_async(session_id)
        return to_api_session_metadata(session)


@router.post("/sessions")
async def create_session(
    session: schemas.NewSession, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    """
    Create a new session for the authenticated user.

    Provide:
    - **title**: Session title (required)
    - **description**: Optional description
    - **content**: Session content (required)

    The system automatically generates:
    - Unique session ID
    - Creation and update timestamps
    - Version number (starts at 1)
    - Content hash for integrity checking

    Returns the ID of the newly created session.
    """
    session_store = SessionStore.create_instance(authenticated_user.get_user_id())
    async with session_store:
        session_id = await session_store.create_async(
            title=session.title, description=session.description, content=session.content
        )
        return session_id


@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    session_update: schemas.SessionUpdate,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.Session:
    """
    Update an existing session with partial or complete changes.

    You can update any combination of:
    - **title**: New session title
    - **description**: New description
    - **content**: New session content

    All fields are optional - only provided fields will be updated.

    The system automatically:
    - Updates the `updated_at` timestamp
    - Increments the version number
    - Recalculates the content hash if content changed
    - Preserves ownership and creation metadata

    Returns the complete updated session.

    Only the session owner can update their sessions.
    """
    session_store = SessionStore.create_instance(authenticated_user.get_user_id())
    async with session_store:
        updated_session = await session_store.update_async(
            session_id,
            title=session_update.title,
            description=session_update.description,
            content=session_update.content,
        )
        return to_api_session(updated_session)


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> None:
    """
    Permanently delete a session.

    This operation:
    - Removes the session document from the database
    - Cannot be undone
    - Requires ownership verification

    Only the session owner can delete their sessions.
    """
    session_store = SessionStore.create_instance(authenticated_user.get_user_id())
    async with session_store:
        await session_store.delete_async(session_id)


@router.get("/snapshot_access_logs")
@no_cache
# pylint: disable=too-many-arguments
async def get_snapshot_access_logs(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    page_size: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
    sort_by: Optional[SnapshotAccessLogSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    sort_lowercase: bool = Query(False, description="Use case-insensitive sorting"),
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_created_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_created_to: Optional[str] = Query(None, description="Filter results by date"),
    filter_last_visited_from: Optional[str] = Query(None, description="Filter results by date of last visit"),
    filter_last_visited_to: Optional[str] = Query(None, description="Filter results by date of last visit"),
    filter_owner_id: Optional[str] = Query(None, description="Filter results by snapshot owner ID"),
    filter_snapshot_deleted: Optional[bool] = Query(
        None, description="Filter results by deletion status of the snapshot"
    ),
) -> schemas.Page[schemas.SnapshotAccessLog]:
    """
    Get a list of all snapshots you have visited.

    This endpoint tracks your interaction history with snapshots, including:
    - Snapshots you've created (counted as implicit visits)
    - Snapshots you've viewed
    - Snapshots shared with you that you've accessed

    Each access log entry includes:
    - **Visit count**: Number of times you've viewed the snapshot
    - **First visited**: Timestamp of your first visit
    - **Last visited**: Timestamp of your most recent visit
    - **Snapshot metadata**: Title, description, creation date
    - **Deletion status**: Whether the snapshot has been deleted

    Supports pagination, sorting, and filtering by:
    - Title (case insensitive)
    - Creation date range
    - Last visited date range
    """
    log_store = SnapshotAccessLogStore.create_instance(authenticated_user.get_user_id())

    async with log_store:
        filter_factory = FilterFactory(SnapshotAccessLogDocument)
        filters = []
        if filter_title:
            filters.append(filter_factory.create("snapshot_metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_created_from:
            filters.append(filter_factory.create("snapshot_metadata.created_at", filter_created_from, "MORE", "_from"))
        if filter_created_to:
            filters.append(filter_factory.create("snapshot_metadata.created_at", filter_created_to, "LESS", "_to"))
        if filter_last_visited_from:
            filters.append(filter_factory.create("last_visited_at", filter_last_visited_from, "MORE", "_from"))
        if filter_last_visited_to:
            filters.append(filter_factory.create("last_visited_at", filter_last_visited_to, "LESS", "_to"))
        if filter_owner_id:
            filters.append(filter_factory.create("snapshot_owner_id", filter_owner_id, "EQUAL"))
        if filter_snapshot_deleted is not None:
            filters.append(filter_factory.create("snapshot_deleted", filter_snapshot_deleted, "EQUAL"))

        (items, cont_token) = await log_store.get_many_for_user_async(
            page_token=cursor,
            page_size=page_size,
            sort_by=sort_by,
            sort_direction=sort_direction,
            sort_lowercase=sort_lowercase,
            filters=filters if filters else None,
        )

        return schemas.Page(items=[to_api_snapshot_access_log(item) for item in items], pageToken=cont_token)


@router.get("/snapshots")
@no_cache
async def get_snapshots_metadata(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    cursor: Optional[str] = Query(None, description="Continuation token for pagination"),
    page_size: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
    sort_by: Optional[SnapshotSortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(None, description="Sort direction: 'asc' or 'desc'"),
    sort_lowercase: bool = Query(False, description="Use case-insensitive sorting"),
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_created_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_created_to: Optional[str] = Query(None, description="Filter results by date"),
) -> schemas.Page[schemas.SnapshotMetadata]:
    """
    Get a paginated list of your snapshot metadata.

    Returns metadata for snapshots you own (without content) with support for:
    - **Pagination**: Use continuation tokens for large result sets
    - **Sorting**: Sort by title, creation date, etc.
    - **Filtering**: Filter by title and date ranges

    Snapshots are immutable records that can be shared with others.
    They are separate from sessions and are intended for point-in-time captures.

    Note: Consider using `/persistence/snapshot_access_logs` to see both your snapshots and ones shared with you.
    """
    snapshot_store = SnapshotStore.create_instance(authenticated_user.get_user_id())
    async with snapshot_store:
        filter_factory = FilterFactory(SnapshotDocument)
        filters = []
        if filter_title:
            filters.append(filter_factory.create("metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_created_from:
            filters.append(filter_factory.create("metadata.created_at", filter_created_from, "MORE", "_from"))
        if filter_created_to:
            filters.append(filter_factory.create("metadata.created_at", filter_created_to, "LESS", "_to"))

        items, cont_token = await snapshot_store.get_many_async(
            page_token=cursor,
            page_size=page_size,
            sort_by=sort_by,
            sort_direction=sort_direction,
            sort_lowercase=sort_lowercase,
            filters=filters if filters else None,
        )
        return schemas.Page(items=[to_api_snapshot_metadata(item) for item in items], pageToken=cont_token)


@router.get("/snapshots/{snapshot_id}")
@no_cache
async def get_snapshot(
    snapshot_id: str, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.Snapshot:
    """
    Retrieve a complete snapshot by its ID.

    Returns the full snapshot document including:
    - Snapshot metadata (title, description, creation date, etc.)
    - Complete snapshot content

    **Important**: This endpoint automatically tracks your visit:
    - Increments the visit counter
    - Updates the "last visited" timestamp
    - Creates an access log entry if this is your first visit

    This allows you to see your viewing history in `/persistence/snapshot_access_logs`.

    Any user with the snapshot ID can access snapshots (they are shareable).
    """
    snapshot_store = SnapshotStore.create_instance(authenticated_user.get_user_id())
    log_store = SnapshotAccessLogStore.create_instance(user_id=authenticated_user.get_user_id())

    async with snapshot_store, log_store:
        snapshot = await snapshot_store.get_async(snapshot_id)
        # Should we clear the log if a snapshot was not found? This could mean that the snapshot was
        # deleted but deletion of logs has failed
        await log_store.log_snapshot_visit_async(snapshot_id, snapshot.owner_id)
        return to_api_snapshot(snapshot)


@router.post("/snapshots")
async def create_snapshot(
    snapshot: schemas.NewSnapshot, authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    """
    Create a new snapshot for point-in-time capture.

    Provide:
    - **title**: Snapshot title (required)
    - **description**: Optional description
    - **content**: Snapshot content (required)

    The system automatically:
    - Generates a unique snapshot ID
    - Records creation timestamp
    - Calculates content hash for integrity
    - **Logs an implicit visit** (so it appears in your visited snapshots)

    Snapshots are immutable and can be shared with others via their ID.

    Returns the ID of the newly created snapshot.
    """
    snapshot_access = SnapshotStore.create_instance(authenticated_user.get_user_id())
    log_store = SnapshotAccessLogStore.create_instance(authenticated_user.get_user_id())

    async with snapshot_access, log_store:
        snapshot_id = await snapshot_access.create_async(
            title=snapshot.title, description=snapshot.description, content=snapshot.content
        )

        # We count snapshot creation as implicit visit. This also makes it so we can get recently created ones alongside other shared screenshots
        await log_store.log_snapshot_visit_async(
            snapshot_id=snapshot_id, snapshot_owner_id=authenticated_user.get_user_id()
        )
        return snapshot_id


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    background_tasks: BackgroundTasks,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    """
    Permanently delete a snapshot.

    This operation:
    - Removes the snapshot document from the database
    - Marks all access logs as deleted (background task)
    - Cannot be undone
    - Requires ownership verification

    **Background Processing:**
    Access logs are marked as deleted asynchronously to avoid blocking the response.
    This typically completes within seconds for snapshots with <150 visitor logs.

    Only the snapshot owner can delete their snapshots.
    """
    snapshot_store = SnapshotStore.create_instance(authenticated_user.get_user_id())
    log_store = SnapshotAccessLogStore.create_instance(authenticated_user.get_user_id())

    async with snapshot_store, log_store:
        await snapshot_store.delete_async(snapshot_id)
        await log_store.delete_user_log_for_snapshot_async(snapshot_id)

    # This is the fastest solution for the moment. As we are expecting <= 150 logs per snapshot
    # and consistency is not critical, we can afford to do this in the background and without
    # a safety net. We can later consider adding this to a queue for better reliability.
    background_tasks.add_task(mark_logs_deleted_task, snapshot_id=snapshot_id)


@router.delete("/snapshot_access_logs/{snapshot_id}")
async def delete_snapshot_access_log(
    snapshot_id: str,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> None:
    """
    Delete your access log for a specific snapshot.

    This operation:
    - Removes your access log entry for the given snapshot
    - Does NOT affect the snapshot itself or other users' logs

    Use this endpoint to clear your visit history for a snapshot
    without deleting the snapshot or impacting other users.
    """
    log_store = SnapshotAccessLogStore.create_instance(authenticated_user.get_user_id())

    async with log_store:
        await log_store.delete_user_log_for_snapshot_async(snapshot_id)
