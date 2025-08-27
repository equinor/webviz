from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel
from pydantic.json_schema import SkipJsonSchema


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


# SkipJsonSchema is so the field is optional, but not nullable
class SessionMetadataUpdate(BaseModel):
    title: str | SkipJsonSchema[None] = None
    description: str | None = None


class SessionUpdate(BaseModel):
    id: str
    metadata: SessionMetadataUpdate | SkipJsonSchema[None] = None
    content: str | SkipJsonSchema[None] = None


class NewSession(BaseModel):
    title: str
    description: Optional[str]
    content: str


class SessionSortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"


class SessionSortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"
