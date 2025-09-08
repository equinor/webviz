from typing import Any, List
from datetime import datetime, timezone
from nanoid import generate

from primary.services.database_access.session_access.model import SessionDocument
from primary.services.database_access._utils import hash_json_string, cast_query_params
from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.query_collation_options import QueryCollationOptions, SortDirection, Filter
from primary.services.database_access.session_access.types import (
    NewSession,
    SessionMetadataWithId,
    SessionMetadata,
    SessionUpdate,
    SessionSortBy,
)
from primary.services.database_access.database_access_exceptions import (
    DatabaseAccessError,
)
from primary.services.database_access.error_converter import raise_service_error_from_database_access

# Util dict to handle case insensitive collation
LOWERCASED_FIELDS = [SessionSortBy.TITLE]


class SessionAccess:
    CONTAINER_NAME = "sessions"
    DATABASE_NAME = "persistence"

    def __init__(self, user_id: str, session_container_access: ContainerAccess[SessionDocument]):
        self.user_id = user_id
        self.session_container_access = session_container_access

    async def __aenter__(self) -> "SessionAccess":
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object | None
    ) -> None:
        await self.session_container_access.close_async()

    @classmethod
    def create(cls, user_id: str) -> "SessionAccess":
        session_container_access = ContainerAccess.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SessionDocument)
        return cls(user_id=user_id, session_container_access=session_container_access)

    async def get_session_by_id_async(self, session_id: str) -> SessionDocument:
        try:
            document = await self.session_container_access.get_item_async(
                item_id=session_id, partition_key=self.user_id
            )
            return document
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def get_all_sessions_metadata_for_user_async(self) -> List[SessionMetadataWithId]:
        try:
            query = "SELECT * FROM c WHERE c.owner_id = @owner_id"
            params = cast_query_params([{"name": "@owner_id", "value": self.user_id}])
            items = await self.session_container_access.query_items_async(query=query, parameters=params)
            return [self._to_metadata_summary(item) for item in items]
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def get_user_sessions_by_page_async(
        self,
        continuation_token: str | None = None,
        page_size: int | None = None,
        sort_by: SessionSortBy | None = None,
        sort_direction: SortDirection | None = None,
        filter_title: str | None = None,
        filter_updated_from: str | None = None,
        filter_updated_to: str | None = None,
    ) -> tuple[list[SessionDocument], str | None]:
        sort_by_field = sort_by.value if sort_by else None
        sort_by_lowercase = sort_by in LOWERCASED_FIELDS

        filters: list[Filter] = [Filter("owner_id", self.user_id)]

        if filter_title:
            filters.append(Filter("metadata.title__lower", filter_title.lower(), "CONTAINS"))
        if filter_updated_from:
            filters.append(Filter("metadata.updated_at", filter_updated_from, "MORE", "_from"))
        if filter_updated_to:
            filters.append(Filter("metadata.updated_at", filter_updated_to, "LESS", "_to"))

        collation_options = QueryCollationOptions(
            sort_lowercase=sort_by_lowercase,
            sort_dir=sort_direction,
            sort_by=sort_by_field,
            filters=filters,
        )

        query = "SELECT * from c"
        params = collation_options.make_query_params()
        search_options = collation_options.to_sql_query_string()

        if search_options:
            query = f"{query} {search_options}"

        return await self.session_container_access.query_items_by_page_token_async(
            query=query, parameters=params, page_size=page_size, page_token=continuation_token
        )

    async def get_filtered_sessions_metadata_for_user_async(
        self,
        sort_by: SessionSortBy | None,
        sort_direction: SortDirection | None,
        limit: int | None,
        offset: int | None,
        filter_title: str | None,
        filter_updated_from: str | None,
        filter_updated_to: str | None,
    ) -> List[SessionMetadataWithId]:
        try:
            sort_by_field = sort_by.value if sort_by else None
            sort_by_lowercase = sort_by in LOWERCASED_FIELDS

            filters: list[Filter] = [Filter("owner_id", self.user_id)]

            if filter_title:
                filters.append(Filter("metadata.title__lower", filter_title.lower(), "CONTAINS"))
            if filter_updated_from:
                filters.append(Filter("metadata.updated_at", filter_updated_from, "MORE", "_from"))
            if filter_updated_to:
                filters.append(Filter("metadata.updated_at", filter_updated_to, "LESS", "_to"))

            collation_options = QueryCollationOptions(
                sort_lowercase=sort_by_lowercase,
                sort_dir=sort_direction,
                sort_by=sort_by_field,
                offset=offset,
                limit=limit,
                filters=filters,
            )

            query = "SELECT * from c"
            params = collation_options.make_query_params()
            search_options = collation_options.to_sql_query_string()

            if search_options:
                query = f"{query} {search_options}"

            items = await self.session_container_access.query_items_async(query=query, parameters=params)

            return [self._to_metadata_summary(item) for item in items]
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def get_session_metadata_async(self, session_id: str) -> SessionMetadata:
        try:
            document = await self._assert_ownership_async(session_id)
            return document.metadata
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def insert_session_async(self, new_session: NewSession) -> str:
        try:
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
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def delete_session_async(self, session_id: str) -> None:
        await self._assert_ownership_async(session_id)
        await self.session_container_access.delete_item_async(session_id, partition_key=self.user_id)

    async def update_session_async(self, session_id: str, session_update: SessionUpdate) -> SessionDocument:
        try:
            existing = await self._assert_ownership_async(session_id)

            # Get all explicitly defined changes
            document_update_dict = session_update.model_dump(exclude_unset=True, exclude=set(["id"]))
            metadata_update_dict: dict[str, Any] = document_update_dict.get("metadata", {})

            # Early return if there are no changes
            if not document_update_dict and not metadata_update_dict:
                return existing

            # Inject computed fields
            metadata_update_dict.update({"updated_at": datetime.now(timezone.utc)})
            metadata_update_dict.update({"version": existing.metadata.version + 1})

            if session_update.content:
                metadata_update_dict.update({"hash": hash_json_string(session_update.content)})

            updated_metadata = existing.metadata.model_copy(update=metadata_update_dict)
            document_update_dict.update({"metadata": updated_metadata})

            updated_session = existing.model_copy(update=document_update_dict)

            await self.session_container_access.update_item_async(session_id, updated_session)

            return updated_session
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def _assert_ownership_async(self, session_id: str) -> SessionDocument:
        try:
            session = await self.session_container_access.get_item_async(item_id=session_id, partition_key=self.user_id)
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

        if session.owner_id != self.user_id:
            raise ServiceRequestError(f"You do not have permission to access session '{session_id}'.", Service.DATABASE)

        return session

    @staticmethod
    def _to_metadata_summary(doc: SessionDocument) -> SessionMetadataWithId:
        return SessionMetadataWithId(**doc.metadata.model_dump(), id=doc.id)
