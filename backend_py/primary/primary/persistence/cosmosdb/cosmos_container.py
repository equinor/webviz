import logging
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar
from azure.cosmos.aio import ContainerProxy
from azure.cosmos import exceptions
from pydantic import BaseModel, ValidationError

from primary.persistence._utils import query_by_page

from .exceptions import (
    DatabaseAccessError,
    DatabaseAccessIntegrityError,
    DatabaseAccessNotFoundError,
    DatabaseAccessConflictError,
    DatabaseAccessPreconditionFailedError,
    DatabaseAccessPermissionError,
    DatabaseAccessThrottledError,
    DatabaseAccessTransportError,
)


LOGGER = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class CosmosContainer(Generic[T]):
    """
    CosmosContainer provides access to a specific container in a Cosmos DB database.
    It allows for querying, inserting, updating, and deleting items in the container.
    It uses a Pydantic model for item validation and serialization.

    It is designed to be used with asynchronous context management, ensuring proper resource cleanup.
    """

    def __init__(
        self,
        database_name: str,
        container_name: str,
        container: ContainerProxy,
        validation_model: Type[T],
    ):
        self._database_name = database_name
        self._container_name = container_name
        self._container = container
        self._validation_model: Type[T] = validation_model

    def _make_exception(self, op: str, exc: exceptions.CosmosHttpResponseError) -> DatabaseAccessError:
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

        if status == 404:
            return DatabaseAccessNotFoundError(msg, status_code=status, sub_status=substatus, activity_id=activity_id)
        if status == 409:
            return DatabaseAccessConflictError(msg, status_code=status, sub_status=substatus, activity_id=activity_id)
        if status == 412:
            return DatabaseAccessPreconditionFailedError(
                msg, status_code=status, sub_status=substatus, activity_id=activity_id
            )
        if status in (401, 403):
            return DatabaseAccessPermissionError(msg, status_code=status, sub_status=substatus, activity_id=activity_id)
        if status in (429, 503):
            # Typically retryable
            return DatabaseAccessThrottledError(msg, status_code=status, sub_status=substatus, activity_id=activity_id)

        # Fallback
        return DatabaseAccessTransportError(msg, status_code=status, sub_status=substatus, activity_id=activity_id)

    async def query_items_async(self, query: str, parameters: Optional[List[Dict[str, object]]] = None) -> List[T]:
        try:
            items_iterable = self._container.query_items(
                query=query,
                parameters=parameters or [],
            )
            items = [item async for item in items_iterable]
            return [self._validation_model.model_validate(item) for item in items]
        except ValidationError as validation_error:
            LOGGER.error("[CosmosContainer] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("query_items_async", error)

    async def query_items_by_page_token_async(
        self,
        query: str,
        page_token: str | None,
        parameters: Optional[List[Dict[str, object]]] = None,
        page_size: Optional[int] = None,
    ) -> tuple[list[T], str | None]:
        query_iterable = self._container.query_items(query=query, parameters=parameters, max_item_count=page_size)

        pager = query_by_page(query_iterable, page_token)

        try:
            page = await anext(pager)
        except StopAsyncIteration:
            # No items found - return empty list and no continuation token
            return ([], None)

        token = pager.continuation_token

        items = [self._validation_model.model_validate(item) async for item in page]

        return (items, token)

    async def get_item_async(self, item_id: str, partition_key: str) -> T:
        try:
            item = await self._container.read_item(item=item_id, partition_key=partition_key)
            LOGGER.debug("[CosmosContainer] Retrieved item '%s' from '%s'", item_id, self._container_name)
            return self._validation_model.model_validate(item)
        except ValidationError as validation_error:
            LOGGER.error("[CosmosContainer] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("get_item_async", error) from error

    async def insert_item_async(self, item: T) -> str:
        try:
            body: Dict[str, Any] = self._validation_model.model_validate(item).model_dump(by_alias=True, mode="json")
            result = await self._container.create_item(body)
            LOGGER.debug("[CosmosContainer] Inserted item '%s' into '%s'", result["id"], self._container_name)
            return result["id"]
        except ValidationError as validation_error:
            LOGGER.error("[CosmosContainer] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("insert_item_async", error) from error

    async def delete_item_async(self, item_id: str, partition_key: str) -> None:
        try:
            await self._container.delete_item(item=item_id, partition_key=partition_key)
            LOGGER.debug("[CosmosContainer] Deleted item '%s' from '%s'", item_id, self._container_name)
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("delete_item_async", error) from error

    async def update_item_async(self, item_id: str, updated_item: T) -> None:
        try:
            validated = self._validation_model.model_validate(updated_item).model_dump(by_alias=True, mode="json")

            if validated.get("id") and validated["id"] != item_id:
                raise DatabaseAccessIntegrityError(f"id mismatch: payload id {validated['id']} != path id {item_id}")

            await self._container.replace_item(item=item_id, body=validated)

            LOGGER.debug("[CosmosContainer] Updated item '%s' in '%s'", item_id, self._container_name)
        except ValidationError as validation_error:
            LOGGER.error("[CosmosContainer] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("update_item_async", error) from error

    async def patch_item_async(
        self,
        item_id: str,
        partition_key: str,
        patch_operations: list[dict],
        *,
        filter_predicate: str | None = None,
    ) -> None:
        try:
            await self._container.patch_item(
                item=item_id,
                partition_key=partition_key,
                patch_operations=patch_operations,
                filter_predicate=filter_predicate,
                no_response=True,
            )
            LOGGER.debug("[CosmosContainer] Patched item '%s' in '%s'", item_id, self._container_name)
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("patch_item_async", error) from error

    async def query_projection_async(
        self,
        query: str,
        parameters: Optional[List[dict]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Run a query that returns raw dicts (no Pydantic validation), useful for
        projections like SELECT c.id, c.partitionKey.
        """
        try:
            items_iterable = self._container.query_items(
                query=query,
                parameters=parameters or [],
            )
            return [item async for item in items_iterable]
        except exceptions.CosmosHttpResponseError as error:
            raise self._make_exception("query_projection_async", error) from error
