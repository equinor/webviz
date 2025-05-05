from azure.cosmos import CosmosClient, exceptions, PartitionKey, ContainerProxy

# Optionally load and trust emulator certificate
import ssl

from backend_py.primary.primary.config import COSMOS_DB_KEY, COSMOS_DB_URI
from backend_py.primary.primary.services.service_exceptions import Service, ServiceRequestError

# Load emulator self-signed certificate
cert_file = "cosmos-emulator-cert.pem"  # Download this via curl as shown earlier
ssl_context = ssl.create_default_context(cafile=cert_file)

class DatabaseAccess:
    def __init__(self, database_name):
        self.database_name = database_name
        self.client = CosmosClient(COSMOS_DB_URI, COSMOS_DB_KEY, connection_verify=cert_file)
        self._make_database_and_container(database_name)

    def _raise_exception(self, message: str):
        raise ServiceRequestError(f"DatabaseAccess ({self.database_name}): {message}", Service.DATABASE)

    async def _make_database_and_container(self, database_name: str):
        try:
            self.database = self.client.create_database_if_not_exists(id=database_name)
            print(f"Database '{database_name}' is ready.")

            # Create a container (if it doesn't exist)
            container_name = "TestContainer"
            container = self.database.create_container_if_not_exists(
                id=container_name,
                partition_key=PartitionKey(path="/id"),
                offer_throughput=400
            )

        except exceptions.CosmosHttpResponseError as e:
            print(f"An error occurred: {e.message}")

    async def get_container(self, container_name: str) -> ContainerProxy:
        try:
            container = self.database.get_container_client(container_name)
            return container
        except exceptions.CosmosHttpResponseError as e:
            print(f"An error occurred: {e.message}")
            return None

class ContainerAccess: 
    def __init__(self, database_name: str, container_name: str):
        self.database_name = database_name
        self.container_name = container_name
        self.database_access = DatabaseAccess(database_name)
        self.container = self.database_access.get_container(container_name)

    def _raise_exception(self, message: str):
        raise ServiceRequestError(f"ContainerAccess ({self.database_name, self.container_name}): {message}", Service.DATABASE)

    def insert_item(self, item: dict) -> bool:
        try:
            self.container.upsert_item(item)
            print("Item inserted.")
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)

    def query_items(self, query: str) -> list:
        try:
            items = list(self.container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            return items
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)
        
    def delete_item(self, item_id: str):
        try:
            self.container.delete_item(item=item_id, partition_key=item_id)
            print(f"Item with id '{item_id}' deleted.")
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)
    
    def update_item(self, item_id: str, updated_item: dict):
        try:
            item = self.container.read_item(item=item_id, partition_key=item_id)
            item.update(updated_item)
            self.container.upsert_item(item)
            print(f"Item with id '{item_id}' updated.")
        except exceptions.CosmosHttpResponseError as e:
            self._raise_exception(e.message)