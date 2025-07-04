import logging
from typing import Dict, Generic, List, Optional, Type, TypeVar
from azure.cosmos.aio import ContainerProxy
from azure.cosmos import exceptions
from pydantic import BaseModel, ValidationError

from primary.services.service_exceptions import Service, ServiceRequestError
from .database_access import DatabaseAccess


logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)
class ContainerAccess(Generic[T]):
    def __init__(
        self, database_name: str, container_name: str, database_access: DatabaseAccess, container: ContainerProxy, schema: Type[T]
    ):
        self.database_name = database_name
        self.container_name = container_name
        self.database_access = database_access
        self.container = container
        self.schema: Type[T] = schema

    @classmethod
    async def create(cls, database_name: str, container_name: str, schema: Type[T]) -> "ContainerAccess[T]":
        db_access = DatabaseAccess.create(database_name)
        container = await db_access.get_container(container_name)
        return cls(database_name, container_name, db_access, container, schema)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close_async()

    def _raise_exception(self, message: str):
        raise ServiceRequestError(
            f"ContainerAccess ({self.database_name}, {self.container_name}): {message}", Service.DATABASE
        )

    async def query_items_async(self, query: str, parameters: Optional[List[Dict[str, object]]] = None) -> List[T]:
        try:
            items_iterable = self.container.query_items(
                query=query,
                parameters=parameters or [],
            )
            items = [item async for item in items_iterable]
            return [self.schema.model_validate(item) for item in items]
        except ValidationError as ve:
            logger.error(f"Validation failed in {self.container_name}: {ve}")
            raise
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def get_item_async(self, item_id: str, partition_key: str) -> T:
        try:
            item = await self.container.read_item(item=item_id, partition_key=partition_key)
            logger.info(f"Item with id '{item_id}' retrieved.")
            return self.schema.model_validate(item)
        except ValidationError as ve:
            logger.error(f"Validation failed in {self.container_name}: {ve}")
            raise
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def insert_item_async(self, item: T) -> str:
        try:
            item = self.schema.model_validate(item).model_dump(by_alias=True, mode="json")
            result = await self.container.upsert_item(item)
            logger.info("Item inserted.")
            return result["id"]
        except ValidationError as ve:
            logger.error(f"Validation failed in {self.container_name}: {ve}")
            raise
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def delete_item_async(self, item_id: str, partition_key: str):
        try:
            await self.container.delete_item(item=item_id, partition_key=partition_key)
            logger.info(f"Item with id '{item_id}' deleted.")
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def update_item_async(self, item_id: str, updated_item: T, partition_key: str):
        try:
            validated = self.schema.model_validate(updated_item).model_dump(by_alias=True, mode="json")
            await self.container.upsert_item(validated, partition_key=partition_key)
            logger.info(f"Item with id '{item_id}' updated.")
        except ValidationError as ve:
            logger.error(f"Validation failed in {self.container_name}: {ve}")
            raise
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def close_async(self):
        """Close the container access."""
        if self.database_access:
            await self.database_access.client.close()
            self.database_access = None
        self.container = None
