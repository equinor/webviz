from typing import Optional

from azure.cosmos.aio import ContainerProxy
from azure.cosmos import exceptions

from primary.services.service_exceptions import Service, ServiceRequestError
from .database_access import DatabaseAccess


class ContainerAccess:
    def __init__(
        self, database_name: str, container_name: str, database_access: DatabaseAccess, container: ContainerProxy
    ):
        self.database_name = database_name
        self.container_name = container_name
        self.database_access = database_access
        self.container = container

    @classmethod
    async def create(cls, database_name: str, container_name: str):
        db_access = await DatabaseAccess.create(database_name)
        container = await db_access.get_container(container_name)
        return cls(database_name, container_name, db_access, container)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.database_access.__aexit__(exc_type, exc, tb)

    def _raise_exception(self, message: str):
        raise ServiceRequestError(
            f"ContainerAccess ({self.database_name}, {self.container_name}): {message}", Service.DATABASE
        )

    async def insert_item(self, item: dict) -> dict:
        try:
            result = await self.container.upsert_item(item)
            print("Item inserted.")
            return result
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def query_items(self, query: str) -> list:
        try:
            items_iterable = self.container.query_items(
                query=query,
            )
            items = [item async for item in items_iterable]
            return items
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def delete_item(self, item_id: str):
        try:
            await self.container.delete_item(item=item_id, partition_key=item_id)
            print(f"Item with id '{item_id}' deleted.")
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    async def update_item(self, item_id: str, updated_item: dict):
        try:
            item = await self.container.read_item(item=item_id, partition_key=item_id)
            item.update(updated_item)
            await self.container.upsert_item(item)
            print(f"Item with id '{item_id}' updated.")
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)
