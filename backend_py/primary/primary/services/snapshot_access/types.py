from typing import Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, computed_field


class SnapshotUserEditableMetadata(BaseModel):
    title: str
    description: Optional[str] = None


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


class SortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"
    LAST_VISIT = "last_visited_at"


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


class SnapshotAccessLog(BaseModel):
    user_id: str  # Partition key
    snapshot_id: str
    visits: int = 0
    first_visited_at: datetime | None = None
    last_visited_at: datetime | None = None

    # Internal item id
    @computed_field  # type: ignore[prop-decorator]
    @property
    # pylint: disable=invalid-name
    # ↳ pylint v2 will complain about names that are shorter than 3 characters
    def id(self) -> str:
        return f"{self.snapshot_id}__{self.user_id}"
