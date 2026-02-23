from typing import Dict, Tuple, Type
import logging

from pydantic import BaseModel
from azure.core.credentials_async import AsyncTokenCredential
from azure.core.exceptions import ClientAuthenticationError
from azure.cosmos.aio import CosmosClient, ContainerProxy, DatabaseProxy
from azure.cosmos.exceptions import CosmosHttpResponseError

from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.session_store import SessionStore, SessionDocument
from primary.persistence.setup_local_database import maybe_setup_local_database
from primary.persistence.snapshot_store import (
    SnapshotStore,
    SnapshotDocument,
    SnapshotAccessLogStore,
    SnapshotAccessLogDocument,
)

LOGGER = logging.getLogger(__name__)


async def _probe_cosmos_async(cosmos_client: CosmosClient, database_name: str) -> None:
    try:
        database = cosmos_client.get_database_client(database_name)
        await database.read()
    except CosmosHttpResponseError as exc:
        # 401/403: auth/RBAC; 404: db missing; others: etc.
        raise RuntimeError(
            f"Cosmos probe failed (db={database_name}, status={getattr(exc,'status_code',None)}): "
            f"{getattr(exc,'message', str(exc))}"
        ) from exc


class PersistenceStores:
    def __init__(self, cosmos_client: CosmosClient) -> None:
        self._client = cosmos_client
        self._db_proxies: Dict[str, DatabaseProxy] = {}
        self._container_proxies: Dict[Tuple[str, str], ContainerProxy] = {}
        self._containers: Dict[Tuple[str, str, Type[BaseModel]], CosmosContainer] = {}

    async def _close_async(self) -> None:
        await self._client.close()

    def _get_database_proxy(self, database_name: str) -> DatabaseProxy:
        if database_name not in self._db_proxies:
            self._db_proxies[database_name] = self._client.get_database_client(database_name)
        return self._db_proxies[database_name]

    def _get_container_proxy(self, database_name: str, container_name: str) -> ContainerProxy:
        key = (database_name, container_name)
        if key not in self._container_proxies:
            db_proxy = self._get_database_proxy(database_name)
            self._container_proxies[key] = db_proxy.get_container_client(container_name)
        return self._container_proxies[key]

    def get_container(self, database_name: str, container_name: str, model_cls: Type[BaseModel]) -> CosmosContainer:
        key = (database_name, container_name, model_cls)
        if key not in self._containers:
            container_proxy = self._get_container_proxy(database_name, container_name)
            self._containers[key] = CosmosContainer(database_name, container_name, container_proxy, model_cls)
        return self._containers[key]

    def get_session_store_for_user(self, user_id: str) -> SessionStore:
        container = self.get_container("persistence", "sessions", SessionDocument)
        return SessionStore(user_id, container)

    def get_snapshot_store_for_user(self, user_id: str) -> SnapshotStore:
        container = self.get_container("persistence", "snapshots", SnapshotDocument)
        return SnapshotStore(user_id, container)

    def get_snapshot_access_log_store_for_user(self, user_id: str) -> SnapshotAccessLogStore:
        container = self.get_container("persistence", "snapshot_access_logs", SnapshotAccessLogDocument)
        return SnapshotAccessLogStore(user_id, container, snapshot_store_factory=self.get_snapshot_store_for_user)


class PersistenceStoresSingleton:
    _instance: PersistenceStores | None = None

    @classmethod
    def get_instance(cls) -> PersistenceStores:
        if cls._instance is None:
            raise RuntimeError("PersistenceStoresSingleton is not initialized, call initialize() first")
        return cls._instance

    @classmethod
    async def initialize_with_credential_async(cls, url: str, credential: AsyncTokenCredential) -> None:
        if cls._instance is not None:
            raise RuntimeError("PersistenceStoresSingleton is already initialized")

        # Creation of the client below doesn't actually establish a connection or validate the credential.
        # To try and fail fast if the credential is invalid, we try and get a token from the credential immediately.
        # Note that this check is not exhaustive in the sense that even if it succeeds, there is no guarantee that
        # RBAC permissions are sufficient. The only way to fully verify that is to actually make a call to CosmosClient,
        # which is deferred until the first time we try to access the database.
        try:
            # Use the scope for Azure Cosmos DB
            await credential.get_token("https://cosmos.azure.com/.default")
            LOGGER.info("PersistenceStoresSingleton successfully verified Azure credential for Cosmos DB scope")
        except ClientAuthenticationError as exc:
            raise RuntimeError("Azure authentication failed while acquiring token for Cosmos DB scope") from exc

        cosmos_client = CosmosClient(url, credential)
        try:
            await _probe_cosmos_async(cosmos_client, "persistence")
            LOGGER.info("Successfully connected to Cosmos DB and accessed 'persistence' database")
        except Exception:
            await cosmos_client.close()
            raise

        cls._instance = PersistenceStores(cosmos_client)

    @classmethod
    async def initialize_with_connection_string_async(cls, connection_str: str) -> None:
        if cls._instance is not None:
            raise RuntimeError("PersistenceStoresSingleton is already initialized")

        cosmos_client = CosmosClient.from_connection_string(connection_str)
        try:
            await _probe_cosmos_async(cosmos_client, "persistence")
            LOGGER.info("Successfully connected to Cosmos DB and accessed 'persistence' database")
        except Exception:
            await cosmos_client.close()
            raise

        cls._instance = PersistenceStores(cosmos_client)

    @classmethod
    def initialize_with_emulator(cls) -> None:
        if cls._instance is not None:
            raise RuntimeError("PersistenceStoresSingleton is already initialized")

        # Cosmos DB Emulator defaults
        uri = "https://cosmos-db-emulator:8081"
        key = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=="
        cosmos_client = CosmosClient(uri, key, connection_verify=False)
        maybe_setup_local_database(uri, key)
        cls._instance = PersistenceStores(cosmos_client)

    @classmethod
    async def shutdown_async(cls) -> None:
        if cls._instance is not None:
            # If there are any resources to clean up in PersistenceStores, do it here.
            # pylint: disable=protected-access
            await cls._instance._close_async()
            cls._instance = None
