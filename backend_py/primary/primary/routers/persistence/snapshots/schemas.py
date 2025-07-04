from typing import Optional
from pydantic import BaseModel


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
    user_id: str
    snapshot_id: str
    visits: int
    first_visited_at: str | None
    last_visited_at: str | None

    snapshot_metadata: SnapshotMetadata

    # Internal item id
    @property
    # pylint: disable=invalid-name
    # ↳ pylint v2 will complain about names that are shorter than 3 characters
    def id(self) -> str:
        return f"{self.snapshot_id}__{self.user_id}"
