from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
from operator import attrgetter

from primary.services.database_access._utils import hash_json_string
from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.types import (
    NewSession,
    SessionMetadataSummary,
    SessionRecord,
    SessionMetadata,
    SessionUpdate,
    SortBy,
    SortDirection,
)


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
        return [
            SessionMetadataSummary(
                id=item["id"],
                title=item["metadata"]["title"],
                description=item["metadata"].get("description"),
                created_at=datetime.fromisoformat(item["metadata"]["created_at"]),
                updated_at=datetime.fromisoformat(item["metadata"]["updated_at"]),
                version=item["metadata"]["version"],
                hash=item["metadata"]["hash"],
            )
            for item in items
        ]

    async def get_filtered_sessions_metadata(
        self,
        sort_by: Optional[SortBy] = None,
        sort_direction: Optional[SortDirection] = None,
        limit: Optional[int] = None,
    ) -> List[SessionMetadataSummary]:
        all_metadata = await self.get_all_sessions_metadata_for_user()

        if sort_by:
            try:
                reverse = sort_direction == SortDirection.DESC
                if sort_by == SortBy.title:
                    all_metadata.sort(key=lambda s: s.title.lower() if s.title else "", reverse=reverse)
                else:
                    all_metadata.sort(key=attrgetter(sort_by.value), reverse=reverse)
            except AttributeError as exc:
                raise ServiceRequestError(f"Invalid sort field: {sort_by}", Service.DATABASE) from exc

        if limit is not None:
            return all_metadata[:limit]

        return all_metadata
    
    async def get_session_metadata(self, session_id: str) -> SessionMetadata:
        existing = await self._assert_ownership(session_id)

        return SessionMetadata(
            id=existing.id,
            title=existing.metadata.title,
            description=existing.metadata.description,
            created_at=existing.metadata.created_at,
            updated_at=existing.metadata.updated_at,
            version=existing.metadata.version,
            hash=existing.metadata.hash,
        )

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
                hash=hash_json_string(new_session.content)
            ),
            content=new_session.content,
        )
        await self.container_access.insert_item(session.model_dump(by_alias=True, mode="json"))
        return session_id

    async def delete_session(self, session_id: str):
        await self._assert_ownership(session_id)
        await self.container_access.delete_item(session_id, partition_key=self.user_id)

    async def update_session(self, session_id: str, session_update: SessionUpdate):
        existing = await self._assert_ownership(session_id)

        updated_metadata = existing.metadata.model_copy(
            update={
                "title": session_update.metadata.title,
                "description": session_update.metadata.description,
                "version": existing.metadata.version + 1,
                "updated_at": datetime.now(timezone.utc),
                "hash": hash_json_string(session_update.content),
            }
        )

        updated_session = SessionRecord(
            id=session_id,
            user_id=self.user_id,
            content=session_update.content,
            metadata=updated_metadata,
        )

        await self.container_access.update_item(
            session_id, updated_session.model_dump(by_alias=True, mode="json"), partition_key=self.user_id
        )

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
        return (
            SessionRecord(
                id=session_id,
                user_id=self.user_id,
                metadata=SessionMetadata(**items[0]["metadata"]),
                content=items[0]["content"],
            )
            if items
            else None
        )
