from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class SessionMetadataExternal(BaseModel):
    title: str
    description: Optional[str] = None


class SessionMetadataInternal(BaseModel):
    created_at: datetime
    updated_at: datetime
    version: int


class SessionMetadata(SessionMetadataExternal, SessionMetadataInternal):
    pass

class SessionMetadataSummary(SessionMetadata):
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