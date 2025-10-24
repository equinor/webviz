from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel

from primary.persistence.snapshot_store.utils import make_access_log_item_id


# Type variable for the generic item type
T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    continuation_token: Optional[str] = None


class SessionMetadata(BaseModel):
    id: str
    ownerId: str

    title: str
    description: Optional[str]

    createdAt: str
    updatedAt: str
    version: int
    content_hash: str


class Session(BaseModel):
    metadata: SessionMetadata
    content: str


class SnapshotMetadata(BaseModel):
    id: str
    ownerId: str
    title: str
    description: Optional[str]
    createdAt: str
    content_hash: str


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

    # Internal item id
    @property
    # pylint: disable=invalid-name
    # ↳ pylint v2 will complain about names that are shorter than 3 characters
    def id(self) -> str:
        return make_access_log_item_id(self.snapshotId, self.visitorId)


class SnapshotAccessLogIndexPage(BaseModel):
    items: list[SnapshotAccessLog]
    continuation_token: str | None


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
