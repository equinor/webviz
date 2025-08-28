from primary.services.database_access.session_access.model import SessionDocument
from primary.services.database_access.session_access.types import SessionMetadata, SessionMetadataWithId
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
