import logging
from typing import Any, Dict, Generic, List, Optional, Sequence, Type, TypeVar, NoReturn
from azure.cosmos.aio import ContainerProxy
from azure.cosmos import exceptions
from pydantic import BaseModel, ValidationError

from .database_access import DatabaseAccess
from primary.services.database_access.database_access_exceptions import (
    DatabaseAccessNotFoundError,
    DatabaseAccessConflictError,
    DatabaseAccessPreconditionFailedError,
    DatabaseAccessPermissionError,
    DatabaseAccessThrottledError,
    DatabaseAccessTransportError,
)


logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

"""
ContainerAccess provides access to a specific container in a Cosmos DB database.
It allows for querying, inserting, updating, and deleting items in the container.
It uses a Pydantic model for item validation and serialization.

It is designed to be used with asynchronous context management, ensuring proper resource cleanup.
It raises ServiceRequestError for any issues encountered during operations, providing a clear error message.
"""


class ContainerAccess(Generic[T]):
    def __init__(
        self,
        database_name: str,
        container_name: str,
        database_access: DatabaseAccess,
        container: ContainerProxy,
        validation_model: Type[T],
    ):
        self._database_name = database_name
        self._container_name = container_name
        self._database_access = database_access
        self._container = container
        self._validation_model: Type[T] = validation_model

    @classmethod
    def create(cls, database_name: str, container_name: str, validation_model: Type[T]) -> "ContainerAccess[T]":
        """Create a ContainerAccess instance."""
        db_access = DatabaseAccess.create(database_name)
        container = db_access.get_container(container_name)
        logger.debug("[ContainerAccess] Created for container '%s' in database '%s'", container_name, database_name)
        return cls(database_name, container_name, db_access, container, validation_model)

    async def __aenter__(self):  # pylint: disable=C9001
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):  # pylint: disable=C9001
        await self.close_async()

    def _raise_exception(self, op: str, exc: exceptions.CosmosHttpResponseError) -> NoReturn:
        """Map Cosmos error to a data-access exception with rich context and re-raise."""
        headers = getattr(exc, "headers", {}) or {}
        status = getattr(exc, "status_code", None)
        # Cosmos uses x-ms-substatus for more detail (e.g., 1002)
        substatus_raw = headers.get("x-ms-substatus")
        try:
            substatus = int(substatus_raw) if substatus_raw is not None else None
        except ValueError:
            substatus = None
        activity_id = headers.get("x-ms-activity-id")

        msg = (
            f"[{op}] Cosmos error on {self._database_name}/{self._container_name}: "
            f"{getattr(exc, 'message', None) or str(exc)} "
            f"(status={status}, substatus={substatus}, activity_id={activity_id})"
        )

        # Log with stack trace
        logger.exception(
            "[ContainerAccess] %s",
            msg,
            extra={
                "database": self._database_name,
                "container": self._container_name,
                "operation": op,
                "status_code": status,
                "sub_status": substatus,
                "activity_id": activity_id,
            },
        )

        if status == 404:
            raise DatabaseAccessNotFoundError(
                msg, status_code=status, sub_status=substatus, activity_id=activity_id
            ) from exc
        if status == 409:
            raise DatabaseAccessConflictError(
                msg, status_code=status, sub_status=substatus, activity_id=activity_id
            ) from exc
        if status == 412:
            raise DatabaseAccessPreconditionFailedError(
                msg, status_code=status, sub_status=substatus, activity_id=activity_id
            ) from exc
        if status in (401, 403):
            raise DatabaseAccessPermissionError(
                msg, status_code=status, sub_status=substatus, activity_id=activity_id
            ) from exc
        if status in (429, 503):
            # Typically retryable
            raise DatabaseAccessThrottledError(
                msg, status_code=status, sub_status=substatus, activity_id=activity_id
            ) from exc

        # Fallback
        raise DatabaseAccessTransportError(
            msg, status_code=status, sub_status=substatus, activity_id=activity_id
        ) from exc

    async def query_items_async(self, query: str, parameters: Optional[List[Dict[str, object]]] = None) -> List[T]:
        try:
            items_iterable = self._container.query_items(
                query=query,
                parameters=parameters or [],
            )
            items = [item async for item in items_iterable]
            return [self._validation_model.model_validate(item) for item in items]
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("query_items_async", error)

    async def get_item_async(self, item_id: str, partition_key: str) -> T:
        try:
            item = await self._container.read_item(item=item_id, partition_key=partition_key)
            return self._validation_model.model_validate(item)
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("get_item_async", error)

    async def insert_item_async(self, item: T) -> str:
        try:
            item = self._validation_model.model_validate(item).model_dump(by_alias=True, mode="json")
            result = await self._container.upsert_item(item)
            return result["id"]
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("insert_item_async", error)

    async def delete_item_async(self, item_id: str, partition_key: str):
        try:
            await self._container.delete_item(item=item_id, partition_key=partition_key)
            logger.debug("[ContainerAccess] Deleted item '%s' from '%s'", item_id, self._container_name)
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("delete_item_async", error)

    async def update_item_async(self, item_id: str, updated_item: T):
        try:
            validated = self._validation_model.model_validate(updated_item).model_dump(by_alias=True, mode="json")
            await self._container.upsert_item(validated)
            logger.debug("[ContainerAccess] Updated item '%s' in '%s'", item_id, self._container_name)
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("update_item_async", error)

    async def patch_item_async(
        self,
        item_id: str,
        partition_key: str,
        patch_operations: Sequence[Dict[str, object]],
        *,
        filter_predicate: str | None = None,
    ):
        try:
            await self._container.patch_item(
                item=item_id,
                partition_key=partition_key,
                patch_operations=patch_operations,
                filter_predicate=filter_predicate,
                no_response=True,
            )
            logger.debug("[ContainerAccess] Patched item '%s' in '%s'", item_id, self._container_name)
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("patch_item_async", error)

    async def query_projection_async(
        self,
        query: str,
        parameters: Optional[List[Dict[str, object]]] = None,
        *,
        enable_cross_partition_query: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Run a query that returns raw dicts (no Pydantic validation), useful for
        projections like SELECT c.id, c.partitionKey.
        """
        try:
            items_iterable = self._container.query_items(
                query=query,
                parameters=parameters or [],
                enable_cross_partition_query=enable_cross_partition_query,
            )
            return [item async for item in items_iterable]
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception("query_items_async", error)

    async def close_async(self):
        """Close the container access."""
        if self._database_access:
            logger.debug("[ContainerAccess] Closing access to '%s/%s'", self._database_name, self._container_name)
            await self._database_access.close_async()
            self._database_access = None
        self._container = None
