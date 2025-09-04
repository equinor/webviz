import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.middleware.add_browser_cache import no_cache
from primary.services.database_access.session_access.session_access import SessionAccess
from primary.services.database_access.query_collation_options import SortDirection
from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from primary.services.database_access.session_access.types import NewSession, SessionUpdate, SessionSortBy
from primary.routers.persistence.sessions.converters import (
    to_api_session_metadata_summary,
    to_api_session_metadata,
    to_api_session_record,
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
    # ? Is this becoming too many args? Should we make a post-search endpoint instead?
    filter_title: Optional[str] = Query(None, description="Filter results by title (case insensitive)"),
    filter_updated_from: Optional[str] = Query(None, description="Filter results by date"),
    filter_updated_to: Optional[str] = Query(None, description="Filter results by date"),
) -> list[schemas.SessionMetadataWithId]:
    access = SessionAccess.create(user.get_user_id())

    async with access:
        items = await access.get_filtered_sessions_metadata_for_user_async(
            sort_by=sort_by,
            sort_direction=sort_direction,
            limit=limit,
            offset=limit * page,
            filter_title=filter_title,
            filter_updated_from=filter_updated_from,
            filter_updated_to=filter_updated_to,
        )

        return [to_api_session_metadata_summary(item) for item in items]


@router.get("/sessions/{session_id}", response_model=schemas.SessionDocument)
@no_cache
async def get_session(
    session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> schemas.SessionDocument:
    access = SessionAccess.create(user.get_user_id())
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
    access = SessionAccess.create(user.get_user_id())
    async with access:
        metadata = await access.get_session_metadata_async(session_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Session metadata not found")
        return to_api_session_metadata(metadata)


@router.post("/sessions", response_model=str)
async def create_session(
    session: NewSession, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)
) -> str:
    access = SessionAccess.create(user.get_user_id())
    async with access:
        session_id = await access.insert_session_async(session)
        return session_id


@router.put("/sessions/{session_id}", description="Updates a session object. Allows for partial update objects")
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> schemas.SessionDocument:
    access = SessionAccess.create(user.get_user_id())
    async with access:
        updated_session = await access.update_session_async(session_id, session_update)
        return to_api_session_record(updated_session)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)) -> None:
    access = SessionAccess.create(user.get_user_id())
    async with access:
        await access.delete_session_async(session_id)
