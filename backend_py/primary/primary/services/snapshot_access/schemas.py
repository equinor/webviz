from pydantic import BaseModel, ConfigDict, field_validator
from primary.services.snapshot_access.types import SnapshotMetadata


class SnapshotMetadataDocument(BaseModel):
    id: str
    snapshot_id: str
    owner_id: str
    metadata: SnapshotMetadata

    @field_validator("snapshot_id")
    @classmethod
    def validate_snapshot_id(cls, v, info):
        if v != info.data.get("id"):
            raise ValueError("snapshot_id must equal id")
        return v

    model_config = ConfigDict(extra="forbid")


class SnapshotContentDocument(BaseModel):
    id: str
    snapshot_id: str
    owner_id: str
    content: str

    @field_validator("snapshot_id")
    @classmethod
    def validate_snapshot_id(cls, v, info):
        if v != info.data.get("id"):
            raise ValueError("snapshot_id must equal id")
        return v

    model_config = ConfigDict(extra="forbid")
