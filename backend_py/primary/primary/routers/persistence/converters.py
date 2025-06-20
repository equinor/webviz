from backend_py.primary.primary.services.database_access.types import SessionMetadata, SessionMetadataSummary, SessionRecord
import schemas


def to_api_session_metadata_summary(session: SessionMetadataSummary) -> schemas.SessionMetadataSummary:
    return schemas.SessionMetadataSummary(
        id=session.id,
        title=session.title,
        description=session.description,
        createdAt=session.created_at.isoformat(),
        updatedAt=session.updated_at.isoformat(),
        version=session.version,
    )


def to_api_session_metadata(metadata: SessionMetadata) -> schemas.SessionMetadata:
    return schemas.SessionMetadata(
        title=metadata.title,
        description=metadata.description,
        createdAt=metadata.created_at.isoformat(),
        updatedAt=metadata.updated_at.isoformat(),
        version=metadata.version,
    )


def to_api_session_record(record: SessionRecord) -> schemas.SessionRecord:
    return schemas.SessionRecord(
        id=record.id,
        userId=record.user_id,
        metadata=to_api_session_metadata(record.metadata),
        content=record.content,
    )