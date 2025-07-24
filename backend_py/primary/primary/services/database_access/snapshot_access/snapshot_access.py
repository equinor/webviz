from hmac import new
from typing import Optional, List
from datetime import datetime, timezone
from nanoid import generate
from azure.cosmos.exceptions import CosmosResourceNotFoundError

from primary.services.database_access.snapshot_access.models import SnapshotContentDocument, SnapshotMetadataDocument
from primary.services.database_access._utils import hash_json_string
from primary.services.service_exceptions import Service, ServiceRequestError
from primary.services.database_access.container_access import ContainerAccess
from primary.services.database_access.snapshot_access.types import (
    NewSnapshot,
    SnapshotMetadata,
    SnapshotMetadataWithId,
    Snapshot,
    SnapshotUpdate,
    SortBy,
    SortDirection,
)


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
        # The content container is partioned by snapshot_id, so we can query it directly.
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
        params = [{"name": "@owner_id", "value": self.user_id}]
        items = await self.metadata_container_access.query_items_async(query=query, parameters=params)
        return [self._to_metadata_summary(item) for item in items]

    async def get_filtered_snapshots_metadata_for_user_async(
        self,
        sort_by: Optional[SortBy] = SortBy.CREATED_AT,
        sort_direction: Optional[SortDirection] = SortDirection.ASC,
        limit: Optional[int] = None,
        offset: Optional[int] = 0,
    ) -> List[SnapshotMetadataWithId]:
        if not isinstance(sort_by.value, str) or not sort_by.value.isidentifier():
            raise ServiceRequestError("Invalid sort field specified.", Service.DATABASE)

        if sort_by == SortBy.TITLE_LOWER:
            metadata_array = await self.get_all_snapshots_metadata_for_user_async()

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

        items = await self.metadata_container_access.query_items_async(query=query, parameters=params)

        return [self._to_metadata_summary(item) for item in items]

    async def get_snapshot_metadata_async(self, snapshot_id: str, owner_id: Optional[str] = None) -> SnapshotMetadata:
        owner = owner_id or self.user_id
        try:
            document = await self.metadata_container_access.get_item_async(snapshot_id, partition_key=owner)
        except CosmosResourceNotFoundError:
            raise ServiceRequestError(f"Snapshot '{snapshot_id}' not found for user '{owner}'.", Service.DATABASE)
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
            layout_preview=new_snapshot.layout_preview,
        )

        # Store metadata
        await self.metadata_container_access.insert_item_async(
            {
                "id": snapshot_id,
                "snapshot_id": snapshot_id,
                "owner_id": self.user_id,
                "metadata": metadata.model_dump(mode="json", by_alias=True),
            }
        )

        # Store content
        await self.content_container_access.insert_item_async(
            {
                "id": snapshot_id,
                "snapshot_id": snapshot_id,
                "owner_id": self.user_id,
                "content": new_snapshot.content,
            }
        )

        return snapshot_id

    async def delete_snapshot_async(self, snapshot_id: str):
        await self._assert_ownership_async(snapshot_id)
        await self.metadata_container_access.delete_item_async(snapshot_id, partition_key=self.user_id)
        await self.content_container_access.delete_item_async(snapshot_id, partition_key=snapshot_id)

    async def update_snapshot_metadata_async(self, snapshot_id: str, snapshot_update: SnapshotUpdate):
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
            {
                "id": snapshot_id,
                "snapshot_id": snapshot_id,
                "owner_id": self.user_id,
                "metadata": updated_metadata.model_dump(by_alias=True, mode="json"),
            },
        )

    async def _assert_ownership_async(self, snapshot_id: str) -> SnapshotMetadataDocument:
        """Assert that the user owns the snapshot with the given ID."""
        try:
            metadata = await self.metadata_container_access.get_item_async(
                item_id=snapshot_id, partition_key=self.user_id
            )
        except CosmosResourceNotFoundError:
            raise ServiceRequestError(
                f"Snapshot with id '{snapshot_id}' not found for user '{self.user_id}'.", Service.DATABASE
            )

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
