from primary.services.database_access.session_access.model import SessionDocument
from primary.services.database_access.session_access.types import SessionMetadata
from . import schemas


def to_api_session_metadata_summary(session: SessionDocument) -> schemas.SessionMetadataWithId:
    return schemas.SessionMetadataWithId(
        id=session.id,
        title=session.metadata.title,
        description=session.metadata.description,
        createdAt=session.metadata.created_at.isoformat(),
        updatedAt=session.metadata.updated_at.isoformat(),
        version=session.metadata.version,
        hash=session.metadata.hash,
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


def to_api_session_index_page(
    sessions: list[SessionDocument], continuation_token: str | None
) -> schemas.SessionIndexPage:
    return schemas.SessionIndexPage(
        continuation_token=continuation_token,
        items=[to_api_session_metadata_summary(session) for session in sessions],
    )
