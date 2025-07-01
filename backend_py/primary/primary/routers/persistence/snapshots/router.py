import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.services.database_access.snapshot_access import SnapshotAccess
from primary.auth.auth_helper import AuthHelper, AuthenticatedUser
from primary.services.database_access.types import (
    NewSession,
    SessionMetadata,
    SessionUpdate,
    SortBy,
    SortDirection,
)
from primary.routers.persistence.snapshots.converters import to_api_snapshot_metadata_summary
from primary.routers.persistence.sessions.schemas import SessionRecord
from primary.routers.persistence.sessions.converters import to_api_session_metadata, to_api_session_record

from . import schemas

LOGGER = logging.getLogger(__name__)
router = APIRouter()


@router.get("/snapshots", response_model=List[schemas.SnapshotMetadataSummary])
async def get_snapshots_metadata(
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sort_by: Optional[SortBy] = Query(None, description="Sort the result by"),
    sort_direction: Optional[SortDirection] = Query(SortDirection.ASC, description="Sort direction: 'asc' or 'desc'"),
    limit: Optional[int] = Query(10, ge=1, le=100, description="Limit the number of results"),
):
    access = await SnapshotAccess.create(user.get_user_id())
    async with access:
        items = await access.get_filtered_snapshots_metadata(
            sort_by=sort_by, sort_direction=sort_direction, limit=limit
        )
        return [to_api_snapshot_metadata_summary(item) for item in items]


@router.get("/snapshots/{snapshot_id}", response_model=SessionRecord)
async def get_snapshot(snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SnapshotAccess.create(user.get_user_id())
    async with access:
        snapshot = await access.get_snapshot_by_id(snapshot_id)
        if not snapshot:
            raise HTTPException(status_code=404, detail="Session not found")
        return to_api_session_record(snapshot)


@router.get("/snapshots/metadata/{snapshot_id}", response_model=SessionMetadata)
async def get_snapshot_metadata(snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SnapshotAccess.create(user.get_user_id())
    async with access:
        metadata = await access.get_snapshot_metadata(snapshot_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Session metadata not found")
        return to_api_session_metadata(metadata)


@router.post("/snapshots", response_model=str)
async def create_snapshot(session: NewSession, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SnapshotAccess.create(user.get_user_id())
    async with access:
        snapshot_id = await access.make_snapshot(session)
        return snapshot_id


@router.put("/snapshots/{snapshot_id}")
async def update_snapshot(
    snapshot_id: str,
    session_update: SessionUpdate,
    user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    access = await SnapshotAccess.create(user.get_user_id())
    async with access:
        await access.update_snapshot_metadata(snapshot_id, session_update)


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(snapshot_id: str, user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user)):
    access = await SnapshotAccess.create(user.get_user_id())
    async with access:
        await access.delete_snapshot(snapshot_id)
