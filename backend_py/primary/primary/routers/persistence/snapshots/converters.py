from primary.services.snapshot_access.models import SnapshotAccessLog
from primary.services.snapshot_access.types import Snapshot, SnapshotMetadata, SnapshotMetadataWithId

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
        visitorId=access_log.visitor_id,
        snapshotId=access_log.snapshot_id,
        visits=access_log.visits,
        firstVisitedAt=access_log.first_visited_at.isoformat() if access_log.first_visited_at else None,
        lastVisitedAt=access_log.last_visited_at.isoformat() if access_log.last_visited_at else None,
        snapshotMetadata=to_api_snapshot_metadata(metadata),
    )
