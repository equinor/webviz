from typing import Optional
from pydantic import BaseModel


class SessionMetadata(BaseModel):
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    version: int
    hash: str


class SessionMetadataWithId(SessionMetadata):
    id: str


class SessionDocument(BaseModel):
    id: str
    ownerId: str
    metadata: SessionMetadata
    content: str


class SessionIndexPage(BaseModel):
    items: list[SessionMetadataWithId]
    continuation_token: str | None
