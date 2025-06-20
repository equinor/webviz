import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from primary.services.database_access.session_access import SessionAccess
from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from primary.services.database_access.types import NewSession, SessionMetadata, SessionMetadataSummary, SessionRecord, SessionUpdate

from . import schemas

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/sessions", response_model=List[schemas.SessionMetadataSummary])
async def get_sessions_metadata(user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SessionAccess.create(user.get_user_id())
    async with access:
        return await access.get_all_sessions_metadata_for_user()


@router.get("/sessions/{session_id}", response_model=SessionRecord)
async def get_session(session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SessionAccess.create(user.get_user_id())
    async with access:
        session = await access.get_session_by_id(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session


@router.post("/sessions", response_model=str)
async def create_session(session: NewSession, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SessionAccess.create(user.get_user_id())
    async with access:
        id = await access.insert_session(session)
        return id


@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    access = await SessionAccess.create(user.get_user_id())
    async with access:
        await access.update_session(session_id, session_update)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SessionAccess.create(user.get_user_id())
    async with access:
        await access.delete_session(session_id)
