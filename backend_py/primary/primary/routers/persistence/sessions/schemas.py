from typing import Optional
from pydantic import BaseModel


class SessionMetadataWithId(BaseModel):
    id: str
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    version: int


class SessionMetadata(BaseModel):
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    version: int
    hash: str


class SessionDocument(BaseModel):
    id: str
    ownerId: str
    metadata: SessionMetadata
    content: str
