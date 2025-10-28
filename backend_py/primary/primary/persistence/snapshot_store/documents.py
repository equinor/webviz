from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, computed_field

"""
CRITICAL: DATABASE SCHEMA - These models define the structure of snapshot and snapshot access log documents in Cosmos DB.
Changes break existing data: renaming/removing fields breaks queries, changing types causes validation errors,
making optional fields required breaks reads. Plan data migration first. Partition keys CANNOT be changed.
"""


class SnapshotMetadata(BaseModel):
    title: str
    description: Optional[str] = None
    created_at: datetime
    content_hash: str

    # Computed lowercase fields for case-insensitive collation
    @computed_field  # type: ignore[prop-decorator]
    @property
    def title__lower(self) -> str:
        return self.title.lower()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def description__lower(self) -> str | None:
        if self.description is None:
            return None

        return self.description.lower()


class SnapshotDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str  # id of the snapshot document - has to be at top level - also used as partition key
    owner_id: str
    metadata: SnapshotMetadata
    content: str


class SnapshotAccessLogDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str  # id of the access log document - has to be at top level
    visitor_id: str  # user id of the visitor - also used as partition key
    snapshot_id: str
    snapshot_owner_id: str
    visits: int = 0
    first_visited_at: datetime | None = None
    last_visited_at: datetime | None = None
    snapshot_deleted: bool = False
    snapshot_deleted_at: datetime | None = None

    snapshot_metadata: SnapshotMetadata
