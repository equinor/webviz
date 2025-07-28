from typing import Optional, List
from datetime import datetime, timezone
from nanoid import generate
from azure.cosmos.exceptions import CosmosResourceNotFoundError

from primary.services.database_access.session_access.model import SessionDocument
from primary.services.database_access._utils import hash_json_string
from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.session_access.types import (
    NewSession,
    SessionMetadataWithId,
    SessionMetadata,
    SessionUpdate,
    SortBy,
    SortDirection,
)


class SessionAccess:
    CONTAINER_NAME = "sessions"
    DATABASE_NAME = "persistence"

    def __init__(self, user_id: str, session_container_access: ContainerAccess[SessionDocument]):
        self.user_id = user_id
        self.session_container_access = session_container_access

    async def __aenter__(self):  # pylint: disable=C9001
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):  # pylint: disable=C9001
        await self.session_container_access.close_async()

    @classmethod
    def create(cls, user_id: str):
        session_container_access = ContainerAccess.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SessionDocument)
        return cls(user_id=user_id, session_container_access=session_container_access)

    async def get_session_by_id_async(self, session_id: str) -> SessionDocument:
        document = await self.session_container_access.get_item_async(item_id=session_id, partition_key=self.user_id)
        return document

    async def get_all_sessions_metadata_for_user_async(self) -> List[SessionMetadataWithId]:
        query = "SELECT * FROM c WHERE c.owner_id = @owner_id"
        params = [{"name": "@owner_id", "value": self.user_id}]
        items = await self.session_container_access.query_items_async(query=query, parameters=params)
        return [self._to_metadata_summary(item) for item in items]

    async def get_filtered_sessions_metadata_for_user_async(
        self,
        sort_by: Optional[SortBy] = SortBy.CREATED_AT,
        sort_direction: Optional[SortDirection] = SortDirection.ASC,
        limit: Optional[int] = None,
        offset: Optional[int] = 0,
    ) -> List[SessionMetadataWithId]:
        if not isinstance(sort_by.value, str) or not sort_by.value.isidentifier():
            raise ServiceRequestError("Invalid sort field specified.", Service.DATABASE)

        if sort_by == SortBy.TITLE_LOWER:
            metadata_array = await self.get_all_sessions_metadata_for_user_async()

            reverse = sort_direction == SortDirection.DESC
            metadata_array.sort(key=lambda s: s.title.lower() if s.title else "", reverse=reverse)

            return metadata_array[offset:] if limit is None else metadata_array[offset : offset + limit]

        offset_clause = f"OFFSET {offset} LIMIT {limit}" if limit is not None else ""
        query = (
            f"SELECT * FROM c "
            f"WHERE c.owner_id = @owner_id "
            f"ORDER BY c.metadata.{sort_by.value} {sort_direction.value} " + offset_clause
        )

        params = [
            {"name": "@owner_id", "value": self.user_id},
        ]

        items = await self.session_container_access.query_items_async(query=query, parameters=params)

        return [self._to_metadata_summary(item) for item in items]

    async def get_session_metadata_async(self, session_id: str) -> SessionMetadata:
        existing = await self._assert_ownership_async(session_id)

        return existing.metadata

    async def insert_session_async(self, new_session: NewSession) -> str:
        now = datetime.now(timezone.utc)
        session_id = str(generate(size=8))  # Generate a unique session ID
        session = SessionDocument(
            id=session_id,
            owner_id=self.user_id,
            metadata=SessionMetadata(
                title=new_session.title,
                description=new_session.description,
                created_at=now,
                updated_at=now,
                version=1,
                hash=hash_json_string(new_session.content),
            ),
            content=new_session.content,
        )
        return await self.session_container_access.insert_item_async(session)

    async def delete_session_async(self, session_id: str):
        await self._assert_ownership_async(session_id)
        await self.session_container_access.delete_item_async(session_id, partition_key=self.user_id)

    async def update_session_async(self, session_id: str, session_update: SessionUpdate):
        existing = await self._assert_ownership_async(session_id)

        updated_metadata = existing.metadata.model_copy(
            update={
                "title": session_update.metadata.title,
                "description": session_update.metadata.description,
                "version": existing.metadata.version + 1,
                "updated_at": datetime.now(timezone.utc),
                "hash": hash_json_string(session_update.content),
            }
        )

        updated_session = SessionDocument(
            id=session_id,
            owner_id=self.user_id,
            content=session_update.content,
            metadata=updated_metadata,
        )

        await self.session_container_access.update_item_async(session_id, updated_session)

    async def _assert_ownership_async(self, session_id: str) -> SessionDocument:
        try:
            session = await self.session_container_access.get_item_async(item_id=session_id, partition_key=self.user_id)
        except CosmosResourceNotFoundError:
            raise ServiceRequestError(f"Session with id '{session_id}' not found.", Service.DATABASE)

        if session.owner_id != self.user_id:
            raise ServiceRequestError(f"You do not have permission to access session '{session_id}'.", Service.DATABASE)

        return session

    @staticmethod
    def _to_metadata_summary(doc: SessionDocument) -> SessionMetadataWithId:
        return SessionMetadataWithId(**doc.metadata.model_dump(), id=doc.id)
