from primary.persistence.snapshot_store.types import SnapshotMetadata, SnapshotMetadataWithId
from primary.persistence.snapshot_store.documents import SnapshotAccessLogDocument, SnapshotDocument
from primary.persistence.session_store.documents import SessionDocument
from primary.persistence.session_store.types import NewSession, SessionUpdate
from . import schemas


def from_api_new_session(api_session: schemas.NewSession) -> NewSession:
    return NewSession(
        title=api_session.title,
        description=api_session.description,
        content=api_session.content,
    )


def from_api_session_update(api_update: schemas.SessionUpdate) -> SessionUpdate:
    return SessionUpdate(
        title=api_update.title,
        description=api_update.description,
        content=api_update.content,
    )


def to_api_session_metadata(session: SessionDocument) -> schemas.SessionMetadata:
    return schemas.SessionMetadata(
        id=session.id,
        ownerId=session.owner_id,
        title=session.metadata.title,
        description=session.metadata.description,
        createdAt=session.metadata.created_at.isoformat(),
        updatedAt=session.metadata.updated_at.isoformat(),
        version=session.metadata.version,
        content_hash=session.metadata.content_hash,
    )


def to_api_session(document: SessionDocument) -> schemas.Session:
    return schemas.Session(
        metadata=to_api_session_metadata(document.metadata),
        content=document.content,
    )


def from_api_new_snapshot(api_snapshot: schemas.NewSnapshot) -> NewSession:
    return NewSession(
        title=api_snapshot.title,
        description=api_snapshot.description,
        content=api_snapshot.content,
    )


def to_api_snapshot_metadata(snapshot: SnapshotDocument) -> schemas.SnapshotMetadata:
    return schemas.SnapshotMetadata(
        id=snapshot.id,
        ownerId=snapshot.owner_id,
        title=snapshot.metadata.title,
        description=snapshot.metadata.description,
        createdAt=snapshot.metadata.created_at.isoformat(),
        content_hash=snapshot.metadata.content_hash,
    )


def to_api_snapshot(snapshot: SnapshotDocument) -> schemas.Snapshot:
    return schemas.Snapshot(
        metadata=to_api_snapshot_metadata(snapshot),
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
