from primary.services.database_access.types import SessionMetadataSummary
from . import schemas


def to_api_snapshot_metadata_summary(session: SessionMetadataSummary) -> schemas.SnapshotMetadataSummary:
    return schemas.SnapshotMetadataSummary(
        id=session.id,
        title=session.title,
        description=session.description,
        createdAt=session.created_at.isoformat(),
        updatedAt=session.updated_at.isoformat(),
        version=session.version,
    )