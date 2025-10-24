from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SessionSortBy(str, Enum):
    CREATED_AT = "metadata.created_at"
    UPDATED_AT = "metadata.updated_at"
    TITLE = "metadata.title"


class NewSession(BaseModel):
    """
    Model for creating a new session.
    Only includes user-provided fields. All other fields are managed by the store:
    - id: Auto-generated
    - owner_id: Set from user context
    - metadata.created_at: Set to current time
    - metadata.updated_at: Set to current time
    - metadata.hash: Computed from content
    - metadata.version: Set to 1

    Usage:
        new_session = NewSession(
            title="My Session",
            description="Optional description",
            content="session content here"
        )
        session_id = await store.create_async(new_session)
    """

    title: str
    description: str | None = None
    content: str

    model_config = ConfigDict(extra="forbid")


class SessionMetadataUpdate(BaseModel):
    """
    Defines which metadata fields can be updated by users.
    Only publicly editable fields are included.
    Internal fields (created_at, updated_at, hash, version) are managed by the store.
    """

    title: Optional[str] = None
    description: Optional[str | None] = None

    model_config = ConfigDict(extra="forbid")


class SessionUpdate(BaseModel):
    """
    Defines which SessionDocument fields can be updated.
    All fields are optional to support partial updates.

    Fields NOT included (managed by store):
    - id: Cannot be changed
    - owner_id: Cannot be changed
    - metadata.created_at: Set on creation only
    - metadata.updated_at: Automatically updated by store
    - metadata.hash: Automatically computed by store
    - metadata.version: Automatically incremented by store

    Usage:
        # Update just the title
        update = SessionUpdate(metadata=SessionMetadataUpdate(title="New Title"))
        await store.update_async(session_id, update)

        # Update content and description
        update = SessionUpdate(
            content="new content here",
            metadata=SessionMetadataUpdate(description="Updated description")
        )
        await store.update_async(session_id, update)
    """

    content: Optional[str] = None
    metadata: Optional[SessionMetadataUpdate] = None

    model_config = ConfigDict(extra="forbid")
