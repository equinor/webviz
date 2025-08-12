import logging
from typing import Dict, Generic, List, Optional, Type, TypeVar
from azure.cosmos.aio import ContainerProxy
from azure.cosmos import exceptions
from pydantic import BaseModel, ValidationError

from primary.services.service_exceptions import Service, ServiceRequestError
from .database_access import DatabaseAccess


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

    def _raise_exception(self, message: str):
        raise ServiceRequestError(
            f"ContainerAccess ({self._database_name}, {self._container_name}): {message}", Service.DATABASE
        )

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
            self._raise_exception(error.message)

    async def get_item_async(self, item_id: str, partition_key: str) -> T:
        try:
            item = await self._container.read_item(item=item_id, partition_key=partition_key)
            return self._validation_model.model_validate(item)
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception(error.message)

    async def insert_item_async(self, item: T) -> str:
        try:
            item = self._validation_model.model_validate(item).model_dump(by_alias=True, mode="json")
            result = await self._container.upsert_item(item)
            return result["id"]
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception(error.message)

    async def delete_item_async(self, item_id: str, partition_key: str):
        try:
            await self._container.delete_item(item=item_id, partition_key=partition_key)
            logger.debug("[ContainerAccess] Deleted item '%s' from '%s'", item_id, self._container_name)
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception(error.message)

    async def update_item_async(self, item_id: str, updated_item: T):
        try:
            validated = self._validation_model.model_validate(updated_item).model_dump(by_alias=True, mode="json")
            await self._container.upsert_item(validated)
            logger.debug("[ContainerAccess] Updated item '%s' in '%s'", item_id, self._container_name)
        except ValidationError as validation_error:
            logger.error("[ContainerAccess] Validation error in '%s': %s", self._container_name, validation_error)
            raise
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception(error.message)

    async def close_async(self):
        """Close the container access."""
        if self._database_access:
            logger.debug("[ContainerAccess] Closing access to '%s/%s'", self._database_name, self._container_name)
            await self._database_access.close_async()
            self._database_access = None
        self._container = None
