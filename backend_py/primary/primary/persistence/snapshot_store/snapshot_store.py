from typing import List, Optional, Tuple, Type
from datetime import datetime, timezone
from nanoid import generate
from webviz_services.service_exceptions import Service, ServiceRequestError

from primary.persistence._utils import hash_session_content_string
from primary.persistence.cosmosdb.query_collation_options import Filter, QueryCollationOptions, SortDirection
from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.cosmosdb.exceptions import DatabaseAccessError, DatabaseAccessNotFoundError
from primary.persistence.cosmosdb.error_converter import raise_service_error_from_database_access

from .documents import SnapshotDocument, SnapshotMetadata
from .types import SnapshotSortBy

_CONTAINER_NAME = "snapshots"
_DATABASE_NAME = "persistence"

# CosmosDB has a 2MB document size limit
# We use 1.5MB to leave room for metadata and safety margin
_MAX_CONTENT_SIZE_BYTES = 1.5 * 1024 * 1024  # 1.5MB

# Pagination limits
_MAX_PAGE_SIZE = 100
_DEFAULT_PAGE_SIZE = 20


class SnapshotStore:
    """
    A simple data store for snapshot documents with CRUD operations.
    Supports pagination, sorting, filtering, and limits.
    """

    def __init__(
        self,
        user_id: str,
        snapshot_container: CosmosContainer[SnapshotDocument],
    ):
        self._user_id = user_id
        self._snapshot_container = snapshot_container

    async def __aenter__(self) -> "SnapshotStore":
        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[object],
    ) -> None:
        await self._snapshot_container.close_async()

    @classmethod
    def create_instance(cls, user_id: str) -> "SnapshotStore":
        snapshot_container = CosmosContainer.create_instance(_DATABASE_NAME, _CONTAINER_NAME, SnapshotDocument)
        return cls(user_id, snapshot_container)

    async def create_async(self, title: str, description: Optional[str], content: str) -> str:
        """
        Create a new snapshot document.

        Args:
            title: The title of the snapshot
            description: The description of the snapshot
            content: The content of the snapshot

        Returns:
            The ID of the created snapshot

        Raises:
            ServiceRequestError: If content size exceeds maximum allowed size
            DatabaseAccessError: If the database operation fails
        """
        # Validate content size
        content_size = len(content.encode("utf-8"))
        if content_size > _MAX_CONTENT_SIZE_BYTES:
            raise ServiceRequestError(
                f"Snapshot content size ({content_size / (1024*1024):.2f}MB) exceeds maximum allowed size of {_MAX_CONTENT_SIZE_BYTES / (1024*1024):.1f}MB",
                Service.DATABASE,
            )

        try:
            now = datetime.now(timezone.utc)
            # Use 12 characters for security (~3.2 x 10^21 combinations)
            # This provides strong protection against enumeration attacks
            # while keeping URLs manageable for sharing
            snapshot_id = generate(size=12)

            snapshot = SnapshotDocument(
                id=snapshot_id,
                owner_id=self._user_id,
                metadata=SnapshotMetadata(
                    title=title,
                    description=description,
                    created_at=now,
                    content_hash=hash_session_content_string(content),
                ),
                content=content,
            )

            return await self._snapshot_container.insert_item_async(snapshot)
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def get_async(self, snapshot_id: str) -> SnapshotDocument:
        """
        Get a single snapshot by ID.

        Args:
            snapshot_id: The ID of the snapshot to retrieve

        Returns:
            The snapshot document

        Raises:
            ServiceRequestError: If the snapshot is not found or user doesn't own it
            DatabaseAccessError: If the database operation fails
        """
        try:
            document = await self._snapshot_container.get_item_async(item_id=snapshot_id, partition_key=snapshot_id)
            return document
        except DatabaseAccessNotFoundError as e:
            raise ServiceRequestError(
                f"Snapshot with id '{snapshot_id}' not found. It might have been deleted.",
                Service.DATABASE,
            ) from e
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def get_many_async(
        self,
        page_token: Optional[str] = None,
        page_size: Optional[int] = None,
        sort_by: Optional[SnapshotSortBy] = None,
        sort_direction: Optional[SortDirection] = None,
        sort_lowercase: bool = False,
        filters: Optional[List[Filter]] = None,
    ) -> Tuple[List[SnapshotDocument], Optional[str]]:
        """
        Get multiple snapshots with support for pagination, sorting, filtering, and limits.

        Args:
            page_token: Token for pagination (if using page-based pagination)
            page_size: Number of items per page (defaults to 20, max 100)
            sort_by: Field name to sort by
            sort_direction: Direction to sort (ASC or DESC)
            sort_lowercase: Whether to use case-insensitive sorting
            filters: List of filters to apply

        Returns:
            Tuple of (list of snapshot documents, continuation token for next page)

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
                document_model=SnapshotDocument,
            )

            query = "SELECT * FROM c"
            params = collation_options.make_query_params()
            search_options = collation_options.to_sql_query_string()

            if search_options:
                query = f"{query} {search_options}"

            return await self._snapshot_container.query_items_by_page_token_async(
                query=query,
                parameters=params,
                page_size=page_size,
                page_token=page_token,
            )

        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def delete_async(self, snapshot_id: str) -> None:
        """
        Delete a snapshot document.

        Args:
            snapshot_id: The ID of the snapshot to delete

        Raises:
            ServiceRequestError: If the user doesn't own the snapshot
            DatabaseAccessError: If the database operation fails
        """
        try:
            snapshot = await self.get_async(snapshot_id)

            if snapshot.owner_id != self._user_id:
                raise ServiceRequestError(
                    f"User does not have permission to delete snapshot with id '{snapshot_id}'",
                    Service.DATABASE,
                )

            await self._snapshot_container.delete_item_async(snapshot_id, partition_key=snapshot_id)
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)
