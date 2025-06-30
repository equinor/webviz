from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class SessionMetadataSummary(BaseModel):
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

class SessionRecord(BaseModel):
    id: str
    userId: str
    metadata: SessionMetadata
    content: str