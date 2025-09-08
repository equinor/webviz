from primary.services.database_access.snapshot_access.models import SnapshotAccessLogDocument, SnapshotDocument
from primary.services.database_access.snapshot_access.types import SnapshotMetadata, SnapshotMetadataWithId

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


def to_api_snapshot(snapshot: SnapshotDocument) -> schemas.Snapshot:
    return schemas.Snapshot(
        id=snapshot.id,
        metadata=to_api_snapshot_metadata(snapshot.metadata),
        content=snapshot.content,
    )


def to_api_snapshot_access_log(access_log: SnapshotAccessLogDocument) -> schemas.SnapshotAccessLog:
    return schemas.SnapshotAccessLog(
        visitorId=access_log.visitor_id,
        snapshotId=access_log.snapshot_id,
        visits=access_log.visits,
        firstVisitedAt=access_log.first_visited_at.isoformat() if access_log.first_visited_at else None,
        lastVisitedAt=access_log.last_visited_at.isoformat() if access_log.last_visited_at else None,
        snapshotDeleted=access_log.snapshot_deleted,
        snapshotMetadata=to_api_snapshot_metadata(access_log.snapshot_metadata),
    )


def to_api_access_log_index_page(
    access_logs: list[SnapshotAccessLogDocument], continuation_token: str | None
) -> schemas.SnapshotAccessLogIndexPage:
    return schemas.SnapshotAccessLogIndexPage(
        continuation_token=continuation_token,
        items=[to_api_snapshot_access_log(log) for log in access_logs],
    )
