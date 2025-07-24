from typing import Optional
from pydantic import BaseModel


class SessionMetadataBase(BaseModel):
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    version: int
    layoutPreview: str


class SessionMetadata(SessionMetadataBase):
    hash: str


class SessionMetadataWithId(SessionMetadataBase):
    id: str


class SessionDocument(BaseModel):
    id: str
    ownerId: str
    metadata: SessionMetadata
    content: str
