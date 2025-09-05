from typing import Optional, List
from datetime import datetime, timezone
from nanoid import generate

from primary.services.database_access.snapshot_access.models import SnapshotDocument
from primary.services.database_access._utils import hash_json_string, cast_query_params
from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.query_collation_options import QueryCollationOptions, SortDirection
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.database_access_exceptions import DatabaseAccessError, DatabaseAccessNotFoundError
from primary.services.database_access.error_converter import raise_service_error_from_database_access

from .types import (
    NewSnapshot,
    SnapshotMetadata,
    SnapshotMetadataWithId,
    SnapshotSortBy,
)


# Util dict to handle case insensitive collation
CASING_FIELD_LOOKUP: dict[SnapshotSortBy | None, SnapshotSortBy] = {SnapshotSortBy.TITLE_LOWER: SnapshotSortBy.TITLE}


class SnapshotAccess:
    CONTAINER_NAME = "snapshots"
    DATABASE_NAME = "persistence"

    def __init__(
        self,
        user_id: str,
        container_access: ContainerAccess[SnapshotDocument],
    ):
        self.user_id = user_id
        self.container_access = container_access

    async def __aenter__(self) -> "SnapshotAccess":
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object | None
    ) -> None:
        await self.container_access.close_async()

    @classmethod
    def create(cls, user_id: str) -> "SnapshotAccess":
        container_access = ContainerAccess.create(cls.DATABASE_NAME, cls.CONTAINER_NAME, SnapshotDocument)
        return cls(user_id, container_access)

    async def get_snapshot_by_id_async(self, snapshot_id: str) -> SnapshotDocument:
        try:
            document = await self.container_access.get_item_async(item_id=snapshot_id, partition_key=snapshot_id)

            return document
        except DatabaseAccessNotFoundError as e:
            raise ServiceRequestError(
                f"Snapshot with id '{snapshot_id}' not found. It might have been deleted.", Service.DATABASE
            ) from e
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def get_all_snapshots_metadata_for_user_async(self) -> List[SnapshotMetadataWithId]:
        try:
            query = "SELECT * FROM c WHERE c.owner_id = @owner_id"
            params = cast_query_params([{"name": "@owner_id", "value": self.user_id}])
            items = await self.container_access.query_items_async(query=query, parameters=params)
            return [self._to_metadata_summary(item) for item in items]
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def get_filtered_snapshots_metadata_for_user_async(
        self,
        sort_by: SnapshotSortBy | None,
        sort_direction: SortDirection | None,
        limit: int | None,
        offset: int | None,
    ) -> List[SnapshotMetadataWithId]:
        try:
            # pylint: disable=consider-iterating-dictionary
            sort_by_lowercase = sort_by in CASING_FIELD_LOOKUP.keys()
            sort_by = CASING_FIELD_LOOKUP.get(sort_by, sort_by)

            collation_options = QueryCollationOptions(
                sort_lowercase=sort_by_lowercase,
                sort_dir=sort_direction,
                sort_by=sort_by,
                offset=offset,
                limit=limit,
            )

            query = "SELECT * FROM c WHERE c.owner_id = @owner_id"
            params = cast_query_params([{"name": "@owner_id", "value": self.user_id}])
            search_options = collation_options.to_sql_query_string("c.metadata")

            if search_options:
                query = f"{query} {search_options}"

            items = await self.container_access.query_items_async(query=query, parameters=params)

            return [self._to_metadata_summary(item) for item in items]
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def get_snapshot_metadata_async(self, snapshot_id: str, owner_id: Optional[str] = None) -> SnapshotMetadata:
        try:
            document = await self.container_access.get_item_async(snapshot_id, partition_key=snapshot_id)
            return document.metadata
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def insert_snapshot_async(self, new_snapshot: NewSnapshot) -> str:
        try:
            now = datetime.now(timezone.utc)
            snapshot_id = generate(size=8)

            snapshot = SnapshotDocument(
                id=snapshot_id,
                owner_id=self.user_id,
                metadata=SnapshotMetadata(
                    owner_id=self.user_id,
                    title=new_snapshot.title,
                    description=new_snapshot.description,
                    created_at=now,
                    updated_at=now,
                    hash=hash_json_string(new_snapshot.content),
                ),
                content=new_snapshot.content,
            )

            return await self.container_access.insert_item_async(snapshot)
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

    async def delete_snapshot_async(self, snapshot_id: str) -> None:
        await self._assert_ownership_async(snapshot_id)
        await self.container_access.delete_item_async(snapshot_id, partition_key=snapshot_id)

    async def _assert_ownership_async(self, snapshot_id: str) -> SnapshotDocument:
        """Assert that the user owns the snapshot with the given ID."""
        try:
            document = await self.container_access.get_item_async(item_id=snapshot_id, partition_key=snapshot_id)
        except DatabaseAccessError as e:
            raise_service_error_from_database_access(e)

        # Check if the snapshot belongs to the user - this should not be necessary if the partition key is set correctly,
        # but it's a good practice to ensure the user has access.
        if document.owner_id != self.user_id:
            raise ServiceRequestError(
                f"You do not have permission to access snapshot '{snapshot_id}'.", Service.DATABASE
            )

        return document

    @staticmethod
    def _to_metadata_summary(doc: SnapshotDocument) -> SnapshotMetadataWithId:
        return SnapshotMetadataWithId(**doc.metadata.model_dump(), id=doc.id)
