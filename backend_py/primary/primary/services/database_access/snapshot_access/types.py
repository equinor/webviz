from typing import Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, computed_field


class SnapshotUserEditableMetadata(BaseModel):
    title: str
    description: Optional[str] = None

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


class SnapshotMetadataInternal(BaseModel):
    owner_id: str
    created_at: datetime
    updated_at: datetime
    hash: str


class SnapshotMetadata(SnapshotUserEditableMetadata, SnapshotMetadataInternal):
    pass


class Snapshot(BaseModel):
    id: str
    owner_id: str
    metadata: SnapshotMetadata
    content: str


class SnapshotMetadataWithId(SnapshotMetadata):
    id: str


class SnapshotUpdate(BaseModel):
    metadata: SnapshotUserEditableMetadata


class NewSnapshot(BaseModel):
    title: str
    description: Optional[str]
    content: str


class SnapshotSortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"
    LAST_VISIT = "last_visited_at"
