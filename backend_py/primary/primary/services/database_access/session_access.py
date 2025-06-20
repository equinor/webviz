from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4

from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.types import NewSession, SessionMetadataSummary, SessionRecord, SessionMetadata, SessionUpdate


class SessionAccess:
    def __init__(self, user_id: str, container_access: ContainerAccess):
        self.user_id = user_id
        self.container_access = container_access

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Clean up if needed (e.g., closing DB connections)
        pass

    @classmethod
    async def create(cls, user_id: str) -> "SessionAccess":
        container = await ContainerAccess.create("persistence", "sessions")
        return cls(user_id=user_id, container_access=container)

    async def get_session_by_id(self, session_id: str) -> Optional[SessionRecord]:
        query = f"SELECT * FROM c WHERE c.id = '{session_id}' AND c.user_id = '{self.user_id}'"
        items = await self.container_access.query_items(query)
        return SessionRecord(**items[0]) if items else None

    async def get_all_sessions_metadata_for_user(self) -> List[SessionMetadataSummary]:
        query = f"SELECT * FROM c WHERE c.user_id = '{self.user_id}'"
        items = await self.container_access.query_items(query)
        return [SessionMetadataSummary(**item) for item in items]

    async def insert_session(self, new_session: NewSession) -> str:
        now = datetime.now(timezone.utc)
        session_id = str(uuid4())
        session = SessionRecord(
            id=session_id,
            user_id=self.user_id,
            metadata=SessionMetadata(
                title=new_session.title,
                description=new_session.description,
                created_at=now,
                updated_at=now,
                version=1,
            ),
            content=new_session.content,
        )
        await self.container_access.insert_item(session.model_dump(by_alias=True, mode="json"))
        return session_id

    async def delete_session(self, session_id: str):
        await self._assert_ownership(session_id)
        await self.container_access.delete_item(session_id)

    async def update_session(self, session_id: str, session_update: SessionUpdate):
        existing = await self._assert_ownership(session_id)

        updated_metadata = session_update.metadata.model_copy(
            update={
                "version": existing.metadata.version + 1,
                "updated_at": datetime.now(timezone.utc),
                "version": existing.metadata.version + 1,
            }
        )
        updated_session = session_update.model_copy(update={"metadata": updated_metadata})

        await self.container_access.update_item(session_id, updated_session.model_dump(by_alias=True, mode="json"))

    async def _assert_ownership(self, session_id: str) -> SessionRecord:
        session = await self._get_session_raw_by_id(session_id)
        if not session:
            raise ServiceRequestError(f"Session with id '{session_id}' not found.", Service.DATABASE)
        if session.user_id != self.user_id:
            raise ServiceRequestError(f"You do not have permission to access session '{session_id}'.", Service.DATABASE)
        return session

    async def _get_session_raw_by_id(self, session_id: str) -> Optional[SessionRecord]:
        query = f"SELECT * FROM c WHERE c.id = '{session_id}'"
        items = await self.container_access.query_items(query)
        return SessionRecord(**items[0]) if items else None
