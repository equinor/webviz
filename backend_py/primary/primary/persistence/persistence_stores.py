from typing import Dict, Tuple, Type
import logging

from pydantic import BaseModel
from azure.cosmos.aio import CosmosClient, ContainerProxy, DatabaseProxy

from primary.persistence.cosmosdb.cosmos_container import CosmosContainer
from primary.persistence.session_store import SessionStore, SessionDocument
from primary.persistence.snapshot_store import (
    SnapshotStore,
    SnapshotDocument,
    SnapshotAccessLogStore,
    SnapshotAccessLogDocument,
)

LOGGER = logging.getLogger(__name__)


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

    def _get_container(self, database_name: str, container_name: str, model_cls: Type[BaseModel]) -> CosmosContainer:
        key = (database_name, container_name, model_cls)
        if key not in self._containers:
            container_proxy = self._get_container_proxy(database_name, container_name)
            self._containers[key] = CosmosContainer(database_name, container_name, container_proxy, model_cls)
        return self._containers[key]

    def get_session_store_for_user(self, user_id: str) -> SessionStore:
        container = self._get_container("persistence", "sessions", SessionDocument)
        return SessionStore(container, user_id)

    def get_snapshot_store_for_user(self, user_id: str) -> SnapshotStore:
        container = self._get_container("persistence", "snapshots", SnapshotDocument)
        return SnapshotStore(container, user_id)

    def get_snapshot_access_log_store_for_user(self, user_id: str) -> SnapshotAccessLogStore:
        container = self._get_container("persistence", "snapshot_access_logs", SnapshotAccessLogDocument)
        return SnapshotAccessLogStore(container, user_id, snapshot_store_factory=self.get_snapshot_store_for_user)


class PersistenceStoresSingleton:
    _instance: PersistenceStores | None = None

    @classmethod
    def get_instance(cls) -> PersistenceStores:
        if cls._instance is None:
            raise RuntimeError("PersistenceStoresSingleton is not initialized, call initialize() first")
        return cls._instance

    @classmethod
    def initialize(cls, cosmos_client: CosmosClient) -> None:
        if cls._instance is not None:
            raise RuntimeError("PersistenceStoresSingleton is already initialized")

        cls._instance = PersistenceStores(cosmos_client)

    @classmethod
    async def shutdown_async(cls) -> None:
        if cls._instance is not None:
            # If there are any resources to clean up in PersistenceStores, do it here.
            # pylint: disable=protected-access
            await cls._instance._close_async()
            cls._instance = None
