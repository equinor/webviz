from primary.persistence.snapshot_store.types import SnapshotMetadata, SnapshotMetadataWithId
from primary.persistence.snapshot_store.documents import SnapshotAccessLogDocument, SnapshotDocument
from primary.persistence.session_store.documents import SessionDocument
from primary.persistence.session_store.types import SessionMetadata, SessionMetadataWithId
from . import schemas


def to_api_session_metadata_summary(metadata: SessionMetadataWithId) -> schemas.SessionMetadataWithId:
    return schemas.SessionMetadataWithId(
        id=metadata.id,
        title=metadata.title,
        description=metadata.description,
        createdAt=metadata.created_at.isoformat(),
        updatedAt=metadata.updated_at.isoformat(),
        version=metadata.version,
        hash=metadata.hash,
    )


def to_api_session_metadata(metadata: SessionMetadata) -> schemas.SessionMetadata:
    return schemas.SessionMetadata(
        title=metadata.title,
        description=metadata.description,
        createdAt=metadata.created_at.isoformat(),
        updatedAt=metadata.updated_at.isoformat(),
        version=metadata.version,
        hash=metadata.hash,
    )


def to_api_session_record(document: SessionDocument) -> schemas.SessionDocument:
    return schemas.SessionDocument(
        id=document.id,
        ownerId=document.owner_id,
        metadata=to_api_session_metadata(document.metadata),
        content=document.content,
    )


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
