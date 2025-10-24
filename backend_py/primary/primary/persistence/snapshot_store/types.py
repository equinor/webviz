from typing import Optional
from enum import Enum
from pydantic import BaseModel, ConfigDict


class NewSnapshot(BaseModel):
    """
    Model for creating a new snapshot.
    Only includes user-provided fields. All other fields are managed by the store:
    - id: Auto-generated (8 character nanoid)
    - owner_id: Set from user context
    - metadata.created_at: Set to current time
    - metadata.content_hash: Computed from content

    Usage:
        new_snapshot = NewSnapshot(
            title="My Snapshot",
            description="Optional description",
            content="snapshot content here"
        )
        snapshot_id = await store.create_async(new_snapshot)
    """

    title: str
    description: Optional[str] = None
    content: str

    model_config = ConfigDict(extra="forbid")


class SnapshotSortBy(str, Enum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"
    TITLE_LOWER = "title_lower"


class SnapshotAccessLogSortBy(str, Enum):
    VISITS = "visits"
    LAST_VISIT = "last_visited_at"
    TITLE = "snapshot_metadata.title"
    TITLE_LOWER = "snapshot_metadata.title__lower"
    CREATED_AT = "snapshot_metadata.created_at"
