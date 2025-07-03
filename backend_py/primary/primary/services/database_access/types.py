from typing import Optional
from unittest.mock import Base
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class SessionMetadataExternal(BaseModel):
    title: str
    description: Optional[str] = None


class SessionMetadataInternal(BaseModel):
    created_at: datetime
    updated_at: datetime
    version: int
    hash: str


class SessionMetadata(SessionMetadataExternal, SessionMetadataInternal):
    pass

class SnapshotMetadataInternal(BaseModel):
    created_at: datetime
    updated_at: datetime

class SnapshotMetadata(SessionMetadataExternal, SnapshotMetadataInternal):
    pass
    
class SessionMetadataSummary(SessionMetadata):
    id: str

class SnapshotMetadataSummary(SnapshotMetadata):
    id: str

class SessionUpdate(BaseModel):
    id: str
    metadata: SessionMetadataExternal
    content: str


class SessionRecord(BaseModel):
    id: str  # session_id
    user_id: str
    metadata: SessionMetadata
    content: str

class NewSession(BaseModel):
    title: str
    description: Optional[str]
    content: str

class SortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"

class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"