from datetime import datetime
from pydantic import BaseModel, ConfigDict, ValidationInfo
from pydantic import computed_field, field_validator


from primary.services.database_access.snapshot_access.types import SnapshotMetadata

from .util import make_access_log_item_id


class SnapshotDocument(BaseModel):
    id: str  # Partition key
    owner_id: str
    metadata: SnapshotMetadata
    content: str

    model_config = ConfigDict(extra="ignore")


class SnapshotAccessLogDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")

    visitor_id: str  # Partition key
    snapshot_id: str
    snapshot_owner_id: str
    visits: int = 0
    first_visited_at: datetime | None = None
    last_visited_at: datetime | None = None
    snapshot_deleted: bool = False
    snapshot_deleted_at: datetime | None = None

    snapshot_metadata: SnapshotMetadata

    # Internal item id
    @computed_field  # type: ignore[prop-decorator]
    @property
    # pylint: disable=invalid-name
    # ↳ pylint v2 will complain about names that are shorter than 3 characters
    def id(self) -> str:
        return make_access_log_item_id(self.snapshot_id, self.visitor_id)
