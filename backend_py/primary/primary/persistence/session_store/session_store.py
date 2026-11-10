from typing import List, Optional, Tuple
from datetime import datetime, timezone
from nanoid import generate
from webviz_services.service_exceptions import Service, ServiceRequestError

from primary.persistence._utils import hash_session_content_string
from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.cosmosdb.query_collation_options import Filter, QueryCollationOptions, SortDirection
from primary.persistence.session_store.types import SessionSortBy
from primary.persistence.cosmosdb.exceptions import DatabaseAccessError
from primary.persistence.cosmosdb.error_converter import raise_service_error_from_database_access

from .documents import SessionDocument, SessionMetadata

# CosmosDB has a 2MB document size limit
# We use 1.5MB to leave room for metadata and safety margin
_MAX_CONTENT_SIZE_BYTES = 1.5 * 1024 * 1024  # 1.5MB

# Pagination limits
_MAX_PAGE_SIZE = 100
_DEFAULT_PAGE_SIZE = 20


class SessionStore:
    """
    A simple data store for session documents with CRUD operations.
    Supports pagination, sorting, filtering, and limits.
    """

    def __init__(self, user_id: str, session_container: CosmosContainer[SessionDocument]):
        self._user_id = user_id
        self._session_container = session_container

    async def create_async(self, title: str, description: Optional[str], content: str) -> str:
        """
        Create a new session document.

        Args:
            title: The title of the session
            description: The description of the session
            content: The content of the session

        Returns:
            The ID of the created session

        Raises:
            ServiceRequestError: If content size exceeds maximum allowed size
            DatabaseAccessError: If the database operation fails
        """
        # Validate content size
        content_size = len(content.encode("utf-8"))
        if content_size > _MAX_CONTENT_SIZE_BYTES:
            raise ServiceRequestError(
                f"Session content size ({content_size / (1024*1024):.2f}MB) exceeds maximum allowed size of {_MAX_CONTENT_SIZE_BYTES / (1024*1024):.1f}MB",
                Service.DATABASE,
            )

        try:
            now = datetime.now(timezone.utc)
            # Use 12 characters for security (~3.2 x 10^21 combinations)
            # This provides strong protection against enumeration attacks
            session_id = str(generate(size=12))

            session = SessionDocument(
                id=session_id,
                owner_id=self._user_id,
                metadata=SessionMetadata(
                    title=title,
                    description=description,
                    created_at=now,
                    updated_at=now,
                    content_hash=hash_session_content_string(content),
                    version=1,
                ),
                content=content,
            )

            return await self._session_container.insert_item_async(session)
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def get_async(self, session_id: str) -> SessionDocument:
        """
        Read a single session by ID.

        Args:
            session_id: The ID of the session to retrieve

        Returns:
            The session document

        Raises:
            ServiceRequestError: If the user doesn't own the session
            DatabaseAccessError: If the database operation fails
        """
        try:
            document = await self._session_container.get_item_async(item_id=session_id, partition_key=self._user_id)

            # Verify ownership
            if document.owner_id != self._user_id:
                raise ServiceRequestError(
                    f"You do not have permission to access session '{session_id}'.",
                    Service.DATABASE,
                )

            return document
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def get_many_async(
        self,
        page_token: Optional[str] = None,
        page_size: Optional[int] = None,
        sort_by: Optional[SessionSortBy] = None,
        sort_direction: Optional[SortDirection] = None,
        sort_lowercase: bool = False,
        filters: Optional[List[Filter]] = None,
    ) -> Tuple[List[SessionDocument], Optional[str]]:
        """
        Read multiple sessions with support for pagination, sorting, filtering, and limits.

        Args:
            page_token: Token for pagination (if using page-based pagination)
            page_size: Number of items per page (defaults to 20, max 100)
            sort_by: Field name to sort by
            sort_direction: Direction to sort (ASC or DESC)
            sort_lowercase: Whether to use case-insensitive sorting
            filters: List of filters to apply

        Returns:
            Tuple of (list of session documents, continuation token for next page)

        Raises:
            DatabaseAccessError: If the database operation fails
        """
        # Enforce pagination limits
        if page_size is None:
            page_size = _DEFAULT_PAGE_SIZE
        elif page_size > _MAX_PAGE_SIZE:
            page_size = _MAX_PAGE_SIZE
        elif page_size < 1:
            page_size = 1

        try:
            # Always filter by owner_id
            filter_list = filters or []
            filter_list.insert(0, Filter("owner_id", self._user_id))

            # Build query with collation options
            collation_options = QueryCollationOptions(
                sort_lowercase=sort_lowercase,
                sort_dir=sort_direction,
                sort_by=sort_by.value if sort_by else None,
                filters=filter_list,
                document_model=SessionDocument,
            )

            query = "SELECT * FROM c"
            params = collation_options.make_query_params()
            search_options = collation_options.to_sql_query_string()

            if search_options:
                query = f"{query} {search_options}"

            return await self._session_container.query_items_by_page_token_async(
                query=query,
                parameters=params,
                page_size=page_size,
                page_token=page_token,
            )

        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def update_async(
        self,
        session_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        content: Optional[str] = None,
    ) -> SessionDocument:
        """
        Update an existing session document with partial updates.

        Args:
            session_id: The ID of the session to update
            title: The new title for the session
            description: The new description for the session
            content: The new content for the session

        Returns:
            The updated session document

        Raises:
            ServiceRequestError: If the user doesn't own the session or content size exceeds limit
            DatabaseAccessError: If the database operation fails
            ValidationError: If updates contain invalid field names or values
        """
        # Validate content size if content is being updated
        if content is not None:
            content_size = len(content.encode("utf-8"))
            if content_size > _MAX_CONTENT_SIZE_BYTES:
                raise ServiceRequestError(
                    f"Session content size ({content_size / (1024*1024):.2f}MB) exceeds maximum allowed size of {_MAX_CONTENT_SIZE_BYTES / (1024*1024):.1f}MB",
                    Service.DATABASE,
                )

        try:
            # Verify ownership and get existing document
            existing = await self.get_async(session_id)

            # Apply partial updates
            updated_session = existing.model_copy()

            if title is not None:
                updated_session.metadata.title = title

            if description is not None:
                updated_session.metadata.description = description

            # Ensure critical fields are preserved
            updated_session.id = session_id
            updated_session.owner_id = self._user_id

            # Update managed metadata fields
            updated_session.metadata.updated_at = datetime.now(timezone.utc)
            updated_session.metadata.version = existing.metadata.version + 1

            # Recompute hash if content changed
            if content is not None:
                updated_session.content = content
                updated_session.metadata.content_hash = hash_session_content_string(content)

            await self._session_container.update_item_async(session_id, updated_session)

            return updated_session
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)

    async def delete_async(self, session_id: str) -> None:
        """
        Delete a session document.

        Args:
            session_id: The ID of the session to delete

        Raises:
            ServiceRequestError: If the user doesn't own the session
            DatabaseAccessError: If the database operation fails
        """
        try:
            # Verify ownership before deletion
            await self.get_async(session_id)

            await self._session_container.delete_item_async(session_id, partition_key=self._user_id)
        except DatabaseAccessError as err:
            raise_service_error_from_database_access(err)
