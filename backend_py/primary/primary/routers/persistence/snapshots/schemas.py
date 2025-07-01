from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class SnapshotMetadataSummary(BaseModel):
    id: str
    title: str
    description: Optional[str]
    createdAt: str
    updatedAt: str
    version: int
