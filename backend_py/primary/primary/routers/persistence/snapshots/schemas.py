from typing import Optional
from pydantic import BaseModel

from primary.services.database_access.snapshot_access.util import make_access_log_item_id


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

    snapshotMetadata: SnapshotMetadata

    # Internal item id
    @property
    # pylint: disable=invalid-name
    # ↳ pylint v2 will complain about names that are shorter than 3 characters
    def id(self) -> str:
        return make_access_log_item_id(self.snapshotId, self.visitorId)
