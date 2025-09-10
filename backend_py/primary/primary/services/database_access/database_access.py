from azure.cosmos.aio import CosmosClient, ContainerProxy
from azure.cosmos import exceptions

from primary.config import COSMOS_DB_PROD_CONNECTION_STRING, COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY
from primary.services.service_exceptions import Service, ServiceRequestError


class DatabaseAccess:
    def __init__(self, database_name: str, client: CosmosClient):
        self._database_name = database_name
        self._client = client
        self._database = self._client.get_database_client(database_name)

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

    async def __aenter__(self):  # pylint: disable=C9001
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):  # pylint: disable=C9001
        await self.close_async()

    def _raise_exception(self, message: str):
        raise ServiceRequestError(f"DatabaseAccess ({self._database_name}): {message}", Service.DATABASE)

    def get_container(self, container_name: str) -> ContainerProxy:
        if not self._client or not self._database:
            self._raise_exception("Database client is not initialized or already closed.")
        if not container_name or not isinstance(container_name, str):
            self._raise_exception("Invalid container name.")

        try:
            container = self._database.get_container_client(container_name)
            return container
        except exceptions.CosmosHttpResponseError as error:
            self._raise_exception(f"Unable to access container '{container_name}': {error.message}")

        return None  # unreachable; satisfies pylint R1710

    async def close_async(self):
        if self._client:
            await self._client.close()
            self._client = None
        self._database = None
