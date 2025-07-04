from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class SessionUserEditableMetadata(BaseModel):
    title: str
    description: Optional[str] = None


class SessionMetadataInternal(BaseModel):
    created_at: datetime
    updated_at: datetime
    hash: str
    version: int


class SessionMetadata(SessionUserEditableMetadata, SessionMetadataInternal):
    pass
    
class SessionMetadataWithId(SessionMetadata):
    id: str

class SessionUpdate(BaseModel):
    id: str
    metadata: SessionUserEditableMetadata
    content: str

class NewSession(BaseModel):
    title: str
    description: Optional[str]
    content: str

class SortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"

class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"