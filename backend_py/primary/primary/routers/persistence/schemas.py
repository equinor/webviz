from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel


# Type variable for the generic item type
T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    pageToken: Optional[str] = None


class SessionMetadata(BaseModel):
    id: str
    ownerId: str

    title: str
    description: Optional[str]

    createdAt: str
    updatedAt: str
    version: int
    contentHash: str


class Session(BaseModel):
    metadata: SessionMetadata
    content: str


class SnapshotMetadata(BaseModel):
    id: str
    ownerId: str
    title: str
    description: Optional[str]
    createdAt: str
    contentHash: str


class Snapshot(BaseModel):
    metadata: SnapshotMetadata
    content: str


class SnapshotAccessLog(BaseModel):
    visitorId: str
    snapshotId: str
    visits: int
    firstVisitedAt: str | None
    lastVisitedAt: str | None
    snapshotDeleted: bool

    snapshotMetadata: SnapshotMetadata


class NewSession(BaseModel):
    title: str
    description: Optional[str]
    content: str


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None


class NewSnapshot(BaseModel):
    title: str
    description: Optional[str]
    content: str
