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
