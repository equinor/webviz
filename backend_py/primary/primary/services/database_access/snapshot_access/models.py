from datetime import datetime
from pydantic import BaseModel, ConfigDict, ValidationInfo
from pydantic import computed_field, field_validator


from primary.services.snapshot_access.types import SnapshotMetadata

from .util import make_access_log_item_id


class SnapshotMetadataDocument(BaseModel):
    id: str
    snapshot_id: str
    owner_id: str
    metadata: SnapshotMetadata

    @field_validator("snapshot_id")
    @classmethod
    def validate_snapshot_id(cls, val: str, info: ValidationInfo) -> str:
        if val != info.data.get("id"):
            raise ValueError("snapshot_id must equal id")
        return val

    model_config = ConfigDict(extra="ignore")


class SnapshotContentDocument(BaseModel):
    id: str
    snapshot_id: str
    owner_id: str
    content: str

    @field_validator("snapshot_id")
    @classmethod
    def validate_snapshot_id(cls, val: str, info: ValidationInfo) -> str:
        if val != info.data.get("id"):
            raise ValueError("snapshot_id must equal id")
        return val

    model_config = ConfigDict(extra="ignore")


class SnapshotAccessLog(BaseModel):
    model_config = ConfigDict(extra="ignore")

    visitor_id: str  # Partition key
    snapshot_id: str
    snapshot_owner_id: str
    visits: int = 0
    first_visited_at: datetime | None = None
    last_visited_at: datetime | None = None

    # Internal item id
    @computed_field  # type: ignore[prop-decorator]
    @property
    # pylint: disable=invalid-name
    # ↳ pylint v2 will complain about names that are shorter than 3 characters
    def id(self) -> str:
        return make_access_log_item_id(self.snapshot_id, self.visitor_id)
