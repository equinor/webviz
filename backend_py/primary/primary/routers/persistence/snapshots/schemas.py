from datetime import datetime
from enum import Enum
from typing import List, Optional
from unittest.mock import Base
from pydantic import BaseModel


class SnapshotMetadata(BaseModel):
    id: str
    ownerId: str
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    hash: str

class Snapshot(BaseModel):
    id: str
    metadata: SnapshotMetadata
    content: str