from datetime import datetime, timezone
from typing import List, Optional, Tuple


from primary.persistence.snapshot_store.types import SnapshotAccessLogSortBy
from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.cosmosdb.exceptions import DatabaseAccessError, DatabaseAccessNotFoundError
from primary.services.service_exceptions import Service, ServiceRequestError

from primary.persistence.cosmosdb.query_collation_options import Filter, QueryCollationOptions, SortDirection
from .documents import SnapshotAccessLogDocument
from .utils import make_access_log_item_id

from .snapshot_store import SnapshotStore


class SnapshotAccessLogStore:
    """
    Specialized store for logging snapshot visits by users.

    This is not a general CRUD store - it contains domain-specific business logic
    for tracking and managing snapshot access logs.
    """

    DATABASE_NAME = "persistence"
    CONTAINER_NAME = "snapshot_access_logs"

    def __init__(
        self,
        user_id: str,
        access_log_container: CosmosContainer[SnapshotAccessLogDocument],
    ):
        self._user_id = user_id
        self._access_log_container = access_log_container

    @classmethod
    def create(cls, user_id: str) -> "SnapshotAccessLogStore":
        access_log_container = CosmosContainer.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SnapshotAccessLogDocument)
        return cls(user_id, access_log_container)

    async def __aenter__(self) -> "SnapshotAccessLogStore":
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object | None,
    ) -> None:
        await self._access_log_container.close_async()

    async def get_for_snapshot_async(self, snapshot_id: str) -> SnapshotAccessLogDocument:
        """
        Get the access log for a specific snapshot.

        Args:
            snapshot_id: The ID of the snapshot

        Returns:
            The access log document for this user and snapshot

        Raises:
            DatabaseAccessNotFoundError: If no log exists
            DatabaseAccessError: If the database operation fails
        """
        item_id = make_access_log_item_id(snapshot_id, self._user_id)
        return await self._access_log_container.get_item_async(item_id, partition_key=self._user_id)

    async def get_many_for_user_async(
        self,
        page_token: Optional[str] = None,
        page_size: Optional[int] = None,
        sort_by: Optional[SnapshotAccessLogSortBy] = None,
        sort_direction: Optional[SortDirection] = None,
        sort_lowercase: bool = False,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        filters: Optional[List[Filter]] = None,
    ) -> Tuple[List[SnapshotAccessLogDocument], Optional[str]]:
        """
        Get multiple access logs with support for pagination, sorting, filtering, and limits.

        Args:
            page_token: Token for pagination (if using page-based pagination)
            page_size: Number of items per page (for page-based pagination)
            sort_by: Field name to sort by (e.g., "snapshot_metadata.title")
            sort_direction: Direction to sort (ASC or DESC)
            sort_lowercase: Whether to use case-insensitive sorting
            limit: Maximum number of items to return (for offset-based pagination)
            offset: Number of items to skip (for offset-based pagination)
            filters: List of filters to apply

        Returns:
            Tuple of (list of access log documents, continuation token for next page)

        Raises:
            DatabaseAccessError: If the database operation fails
        """
        try:
            # Always filter by visitor_id (current user)
            filter_list = filters or []
            filter_list.insert(0, Filter("visitor_id", self._user_id))

            use_page_based = page_token is not None or page_size is not None

            # Build query with collation options
            collation_options = QueryCollationOptions(
                sort_lowercase=sort_lowercase,
                sort_dir=sort_direction,
                sort_by=sort_by.value if sort_by else None,
                offset=None if use_page_based else offset,
                limit=None if use_page_based else limit,
                filters=filter_list,
                document_model=SnapshotAccessLogDocument,
            )

            query = "SELECT * FROM c"
            params = collation_options.make_query_params()
            search_options = collation_options.to_sql_query_string()

            if search_options:
                query = f"{query} {search_options}"

            # Use page-based pagination if continuation_token or page_size is provided
            if use_page_based:
                return await self._access_log_container.query_items_by_page_token_async(
                    query=query,
                    parameters=params,
                    page_size=page_size,
                    page_token=page_token,
                )

            # Otherwise, return all items (respecting limit/offset)
            items = await self._access_log_container.query_items_async(query=query, parameters=params)
            return items, None

        except DatabaseAccessError as err:
            raise ServiceRequestError(f"Failed to get access logs: {str(err)}", Service.DATABASE) from err

    async def create_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
        """
        Create a new access log entry for a snapshot and persist it to the database.

        Args:
            snapshot_id: The ID of the snapshot
            snapshot_owner_id: The owner ID of the snapshot

        Returns:
            The created and persisted access log document

        Raises:
            ServiceRequestError: If unable to retrieve snapshot metadata or create log
        """
        try:
            # Use SnapshotStore to get snapshot metadata
            async with SnapshotStore.create(self._user_id) as snapshot_store:
                snapshot = await snapshot_store.get_async(snapshot_id)

                new_log = SnapshotAccessLogDocument(
                    visitor_id=self._user_id,
                    snapshot_id=snapshot_id,
                    snapshot_owner_id=snapshot_owner_id,
                    snapshot_metadata=snapshot.metadata,
                )

                # Persist to database
                await self._access_log_container.insert_item_async(new_log)

                return new_log
        except DatabaseAccessError as err:
            raise ServiceRequestError(f"Failed to create access log: {str(err)}", Service.DATABASE) from err

    async def get_existing_or_new_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
        """
        Get an existing access log or create a new one if it doesn't exist.

        Note: This DOES persist a new log to the database if one doesn't exist.

        Args:
            snapshot_id: The ID of the snapshot
            snapshot_owner_id: The owner ID of the snapshot

        Returns:
            Existing or newly created access log document

        Raises:
            ServiceRequestError: If the database operation fails
        """
        try:
            return await self.get_for_snapshot_async(snapshot_id)
        except DatabaseAccessNotFoundError:
            return await self.create_async(snapshot_id=snapshot_id, snapshot_owner_id=snapshot_owner_id)
        except DatabaseAccessError as err:
            raise ServiceRequestError(f"Failed to get or create access log: {str(err)}", Service.DATABASE) from err

    async def log_snapshot_visit_async(self, snapshot_id: str, snapshot_owner_id: str) -> SnapshotAccessLogDocument:
        """
        Log a visit to a snapshot, creating or updating the access log.

        This is the main method for tracking snapshot visits. It:
        - Retrieves or creates an access log
        - Increments the visit count
        - Updates the last visited timestamp
        - Sets the first visited timestamp if this is the first visit
        - Persists the changes to the database

        Args:
            snapshot_id: The ID of the snapshot being visited
            snapshot_owner_id: The owner ID of the snapshot

        Returns:
            The updated access log document

        Raises:
            ServiceRequestError: If the database operation fails
        """
        timestamp = datetime.now(timezone.utc)
        try:
            log = await self.get_existing_or_new_async(snapshot_id, snapshot_owner_id)

            # Update visit tracking
            log.visits += 1
            log.last_visited_at = timestamp

            if not log.first_visited_at:
                log.first_visited_at = timestamp

            # Persist to database
            await self._access_log_container.update_item_async(item_id=log.id, updated_item=log)

            return log
        except DatabaseAccessError as err:
            raise ServiceRequestError(f"Failed to log snapshot visit: {str(err)}", Service.DATABASE) from err
