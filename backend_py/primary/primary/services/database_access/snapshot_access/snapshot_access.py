from typing import Optional, List
from datetime import datetime, timezone
from nanoid import generate
from azure.cosmos.exceptions import CosmosResourceNotFoundError

from primary.services.database_access.snapshot_access.models import SnapshotContentDocument, SnapshotMetadataDocument
from primary.services.database_access._utils import hash_json_string, cast_query_params
from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.query_collation_options import QueryCollationOptions, SortDirection
from primary.services.database_access.container_access import ContainerAccess

from .types import (
    NewSnapshot,
    SnapshotMetadata,
    SnapshotMetadataWithId,
    Snapshot,
    SnapshotUpdate,
    SnapshotSortBy,
)

# ! SnapshotLogsAccess is imported at the end of the file


# Util dict to handle case insensitive collation
CASING_FIELD_LOOKUP: dict[SnapshotSortBy | None, SnapshotSortBy] = {SnapshotSortBy.TITLE_LOWER: SnapshotSortBy.TITLE}


class SnapshotAccess:
    CONTAINER_NAMES = {
        "content": "snapshots_content",
        "metadata": "snapshots_metadata",
    }
    DATABASE_NAME = "persistence"

    def __init__(
        self,
        user_id: str,
        metadata_container_access: ContainerAccess[SnapshotMetadataDocument],
        content_container_access: ContainerAccess[SnapshotContentDocument],
    ):
        self.user_id = user_id
        self.metadata_container_access = metadata_container_access
        self.content_container_access = content_container_access

    async def __aenter__(self) -> "SnapshotAccess":
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: object | None
    ) -> None:
        await self.metadata_container_access.close_async()
        await self.content_container_access.close_async()

    @classmethod
    def create(cls, user_id: str) -> "SnapshotAccess":
        metadata_container_access = ContainerAccess.create(
            cls.DATABASE_NAME, cls.CONTAINER_NAMES["metadata"], SnapshotMetadataDocument
        )
        content_container_access = ContainerAccess.create(
            cls.DATABASE_NAME, cls.CONTAINER_NAMES["content"], SnapshotContentDocument
        )
        return cls(user_id, metadata_container_access, content_container_access)

    async def get_snapshot_by_id_async(self, snapshot_id: str) -> Snapshot:
        # We are accessing the content first as we only have the snapshot_id and not the user_id yet.
        # The content container is partitioned by snapshot_id, so we can query it directly.
        # The metadata container is partitioned by user_id, so we need to query it after fetching the content.
        content_document = await self.content_container_access.get_item_async(
            item_id=snapshot_id, partition_key=snapshot_id
        )
        metadata_document = await self.metadata_container_access.get_item_async(
            item_id=snapshot_id, partition_key=content_document.owner_id
        )

        return Snapshot(
            id=snapshot_id,
            owner_id=content_document.owner_id,
            metadata=SnapshotMetadata(**metadata_document.metadata.model_dump(mode="json", by_alias=True)),
            content=content_document.content,
        )

    async def get_all_snapshots_metadata_for_user_async(self) -> List[SnapshotMetadataWithId]:
        query = "SELECT * FROM c WHERE c.owner_id = @owner_id"
        params = cast_query_params([{"name": "@owner_id", "value": self.user_id}])
        items = await self.metadata_container_access.query_items_async(query=query, parameters=params)
        return [self._to_metadata_summary(item) for item in items]

    async def get_filtered_snapshots_metadata_for_user_async(
        self,
        sort_by: SnapshotSortBy | None,
        sort_direction: SortDirection | None,
        limit: int | None,
        offset: int | None,
    ) -> List[SnapshotMetadataWithId]:
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

        items = await self.metadata_container_access.query_items_async(query=query, parameters=params)

        return [self._to_metadata_summary(item) for item in items]

    async def get_snapshot_metadata_async(self, snapshot_id: str, owner_id: Optional[str] = None) -> SnapshotMetadata:
        owner = owner_id or self.user_id
        try:
            document = await self.metadata_container_access.get_item_async(snapshot_id, partition_key=owner)
        except CosmosResourceNotFoundError as err:
            raise ServiceRequestError(
                f"Snapshot '{snapshot_id}' not found for user '{owner}'.", Service.DATABASE
            ) from err
        return document.metadata

    async def insert_snapshot_async(self, new_snapshot: NewSnapshot) -> str:
        now = datetime.now(timezone.utc)
        snapshot_id = generate(size=8)

        metadata = SnapshotMetadata(
            owner_id=self.user_id,
            title=new_snapshot.title,
            description=new_snapshot.description,
            created_at=now,
            updated_at=now,
            hash=hash_json_string(new_snapshot.content),
        )

        # Store metadata
        await self.metadata_container_access.insert_item_async(
            SnapshotMetadataDocument(
                id=snapshot_id,
                snapshot_id=snapshot_id,
                owner_id=self.user_id,
                metadata=metadata,
            )
        )

        # Store content
        await self.content_container_access.insert_item_async(
            SnapshotContentDocument(
                id=snapshot_id,
                snapshot_id=snapshot_id,
                owner_id=self.user_id,
                content=new_snapshot.content,
            )
        )

        return snapshot_id

    async def delete_snapshot_async(self, snapshot_id: str) -> None:
        await self._assert_ownership_async(snapshot_id)
        await self.metadata_container_access.delete_item_async(snapshot_id, partition_key=self.user_id)
        await self.content_container_access.delete_item_async(snapshot_id, partition_key=snapshot_id)

    async def update_snapshot_metadata_async(self, snapshot_id: str, snapshot_update: SnapshotUpdate) -> None:
        logs_access = SnapshotLogsAccess.create(self.user_id)

        existing = await self.metadata_container_access.get_item_async(snapshot_id, partition_key=self.user_id)

        updated_metadata = existing.metadata.model_copy(
            update={
                "title": snapshot_update.metadata.title,
                "description": snapshot_update.metadata.description,
                "updated_at": datetime.now(timezone.utc),
            }
        )

        await self.metadata_container_access.update_item_async(
            snapshot_id,
            SnapshotMetadataDocument(
                id=snapshot_id,
                snapshot_id=snapshot_id,
                owner_id=self.user_id,
                metadata=updated_metadata,
            ),
        )

        await logs_access.update_log_async(snapshot_id, {"snapshot_metadata": updated_metadata})

    async def _assert_ownership_async(self, snapshot_id: str) -> SnapshotMetadataDocument:
        """Assert that the user owns the snapshot with the given ID."""
        try:
            metadata = await self.metadata_container_access.get_item_async(
                item_id=snapshot_id, partition_key=self.user_id
            )
        except CosmosResourceNotFoundError as err:
            raise ServiceRequestError(
                f"Snapshot with id '{snapshot_id}' not found for user '{self.user_id}'.", Service.DATABASE
            ) from err

        # Check if the snapshot belongs to the user - this should not be necessary if the partition key is set correctly,
        # but it's a good practice to ensure the user has access.
        if metadata.owner_id != self.user_id:
            raise ServiceRequestError(
                f"You do not have permission to access snapshot '{snapshot_id}'.", Service.DATABASE
            )

        return metadata

    @staticmethod
    def _to_metadata_summary(doc: SnapshotMetadataDocument) -> SnapshotMetadataWithId:
        return SnapshotMetadataWithId(**doc.metadata.model_dump(), id=doc.id)


# The two access classes use each-other, so we need to put the imports at the bottom of the file
# pylint: disable=wrong-import-position
from .snapshot_logs_access import SnapshotLogsAccess
