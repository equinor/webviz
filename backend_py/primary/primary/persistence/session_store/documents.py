from datetime import datetime
from pydantic import BaseModel, ConfigDict, computed_field

"""
CRITICAL: DATABASE SCHEMA - These models define the structure of session documents in Cosmos DB.
Changes break existing data: renaming/removing fields breaks queries, changing types causes validation errors,
making optional fields required breaks reads. Plan data migration first. Partition keys CANNOT be changed.
"""


class SessionMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # Publicly editable fields
    title: str
    description: str | None

    # Internal fields not editable by user
    created_at: datetime
    updated_at: datetime
    content_hash: str
    version: int

    # Computed lowercase fields for case-insensitive collation
    @computed_field  # type: ignore[prop-decorator]
    @property
    def title__lower(self) -> str:
        return self.title.lower()

    @computed_field  # type: ignore[prop-decorator]
    @property
    def description__lower(self) -> str | None:
        if self.description is None:
            return None

        return self.description.lower()


class SessionDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # id of the session document - has to be at top level - also used as partition key
    id: str

    owner_id: str
    metadata: SessionMetadata
    content: str
