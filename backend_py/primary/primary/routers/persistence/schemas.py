from typing import Optional
from pydantic import BaseModel

from primary.persistence.snapshot_store.utils import make_access_log_item_id


class SessionMetadata(BaseModel):
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    version: int
    hash: str


class SessionMetadataWithId(SessionMetadata):
    id: str


class SessionDocument(BaseModel):
    id: str
    ownerId: str
    metadata: SessionMetadata
    content: str


class SnapshotMetadata(BaseModel):
    ownerId: str
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    hash: str


class SnapshotMetadataWithId(SnapshotMetadata):
    id: str


class Snapshot(BaseModel):
    id: str
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
