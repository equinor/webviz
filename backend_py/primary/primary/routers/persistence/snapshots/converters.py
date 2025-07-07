from primary.services.snapshot_access.types import Snapshot, SnapshotMetadata, SnapshotMetadataWithId
from . import schemas


def to_api_snapshot_metadata_summary(metadata: SnapshotMetadataWithId) -> schemas.SnapshotMetadata:
    return schemas.SnapshotMetadata(
        id=metadata.id,
        ownerId=metadata.owner_id,
        title=metadata.title,
        description=metadata.description,
        createdAt=metadata.created_at.isoformat(),
        updatedAt=metadata.updated_at.isoformat(),
        hash=metadata.hash,
    )


def to_api_snapshot_metadata(metadata: SnapshotMetadata) -> schemas.SnapshotMetadata:
    return schemas.SnapshotMetadata(
        ownerId=metadata.owner_id,
        title=metadata.title,
        description=metadata.description,
        createdAt=metadata.created_at.isoformat(),
        updatedAt=metadata.updated_at.isoformat(),
        hash=metadata.hash,
    )


def to_api_snapshot(snapshot: Snapshot) -> schemas.Snapshot:
    return schemas.Snapshot(
        id=snapshot.id,
        metadata=to_api_snapshot_metadata_summary(snapshot.metadata),
        content=snapshot.content,
    )
