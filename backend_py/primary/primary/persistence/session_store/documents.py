from pydantic import BaseModel, ConfigDict
from primary.persistence.session_store.types import SessionMetadata


class SessionDocument(BaseModel):
    id: str
    owner_id: str
    metadata: SessionMetadata
    content: str

    model_config = ConfigDict(extra="ignore")
