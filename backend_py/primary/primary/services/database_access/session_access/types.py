from datetime import datetime
from enum import Enum
from typing import Optional
import re

from pydantic import BaseModel, Field, validator


class SessionUserEditableMetadata(BaseModel):
    title: str
    description: Optional[str] = None
    layout_preview: str


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
    layout_preview: str
    content: str

    @validator("layout_preview")
    def validate_preview_size_and_format(cls, value):
        if not re.match(r"^data:image/(png|jpeg|webp);base64,", value):
            raise ValueError("Preview image must be a base64-encoded image")

        # Strip the prefix and check size
        base64_data = value.split(",", 1)[-1]
        if len(base64_data) > 500_000:  # ~375KB as base64 (about 280KB raw)
            raise ValueError("Preview image is too large (max ~500KB allowed)")

        return value


class SortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"


class SortDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"
