from azure.cosmos.aio import CosmosClient, ContainerProxy
from azure.cosmos import exceptions

from primary.config import COSMOS_DB_PROD_CONNECTION_STRING, COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY
from primary.services.service_exceptions import Service, ServiceRequestError


class DatabaseAccess:
    def __init__(self, database_name, client: CosmosClient):
        self.database_name = database_name
        self.client = client
        self.database = self.client.get_database_client(database_name)
        self._container_cache: dict[str, ContainerProxy] = {}

    @classmethod
    def create(cls, database_name: str) -> "DatabaseAccess":
        if COSMOS_DB_PROD_CONNECTION_STRING:
            client = CosmosClient.from_connection_string(COSMOS_DB_PROD_CONNECTION_STRING)
        elif COSMOS_DB_EMULATOR_URI and COSMOS_DB_EMULATOR_KEY:
            client = CosmosClient(COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY, connection_verify=False)
        else:
            raise ServiceRequestError(
                "No Cosmos DB production connection string or emulator URI/key provided.", Service.DATABASE
            )
        self = cls(database_name, client)
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()

    def _raise_exception(self, message: str):
        raise ServiceRequestError(f"DatabaseAccess ({self.database_name}): {message}", Service.DATABASE)

    async def get_container(self, container_name: str) -> ContainerProxy:
        if not self.client or not self.database:
            self._raise_exception("Database client is not initialized or already closed.")
        if not container_name or not isinstance(container_name, str):
            self._raise_exception("Invalid container name.")

        if container_name in self._container_cache:
            return self._container_cache[container_name]
        
        try:
            container = self.database.get_container_client(container_name)
            await container.read()
            self._container_cache[container_name] = container
            return container
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(f"Unable to access container '{container_name}': {e.message}")

    async def close(self):
        await self.client.close()
        self.database = None
        self._container_cache.clear()
