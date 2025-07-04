from primary.services.snapshot_access.types import Snapshot, SnapshotMetadata, SnapshotMetadataWithId, SnapshotAccessLog

from . import schemas


def to_api_snapshot_metadata_summary(metadata: SnapshotMetadataWithId) -> schemas.SnapshotMetadataWithId:
    return schemas.SnapshotMetadataWithId(
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
        metadata=to_api_snapshot_metadata(snapshot.metadata),
        content=snapshot.content,
    )


def to_api_snapshot_access_log(access_log: SnapshotAccessLog, metadata: SnapshotMetadata) -> schemas.SnapshotAccessLog:
    return schemas.SnapshotAccessLog(
        user_id=access_log.user_id,
        snapshot_id=access_log.snapshot_id,
        visits=access_log.visits,
        first_visited_at=access_log.first_visited_at.isoformat() if access_log.first_visited_at else None,
        last_visited_at=access_log.last_visited_at.isoformat() if access_log.last_visited_at else None,
        snapshot_metadata=to_api_snapshot_metadata(metadata),
    )
