from typing import Optional
from datetime import datetime
from enum import Enum
from pydantic import BaseModel


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
