from pydantic import BaseModel, ConfigDict, field_validator
from primary.services.database_access.session_access.types import SessionMetadata


class SessionDocument(BaseModel):
    id: str
    owner_id: str
    metadata: SessionMetadata
    content: str

    model_config = ConfigDict(extra="ignore")
