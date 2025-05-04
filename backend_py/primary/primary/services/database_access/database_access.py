from azure.cosmos import CosmosClient, exceptions, PartitionKey

# Optionally load and trust emulator certificate
import ssl

from backend_py.primary.primary.config import COSMOS_DB_KEY, COSMOS_DB_URI

# Load emulator self-signed certificate
cert_file = "cosmos-emulator-cert.pem"  # Download this via curl as shown earlier
ssl_context = ssl.create_default_context(cafile=cert_file)

class DatabaseAccess:
    def __init__(self):
        self.client = CosmosClient(COSMOS_DB_URI, COSMOS_DB_KEY, connection_verify=cert_file)

class Database:
    def __init__(self, database_name: str):
        self.client = CosmosClient(COSMOS_DB_URI, COSMOS_DB_KEY, connection_verify=cert_file)
        self._make_database_and_container(database_name)

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


    

try:

    # Create a container (if it doesn't exist)
    container_name = "TestContainer"
    container = database.create_container_if_not_exists(
        id=container_name,
        partition_key=azure.cosmos.PartitionKey(path="/id"),
        offer_throughput=400
    )
    print(f"Container '{container_name}' is ready.")

    # Insert a document
    item = {"id": "item1", "content": "Hello CosmosDB!"}
    container.upsert_item(item)
    print("Item inserted.")

    # Query documents
    items = list(container.query_items(
        query="SELECT * FROM c",
        enable_cross_partition_query=True
    ))
    for item in items:
        print(item)

except exceptions.CosmosHttpResponseError as e:
    print(f"An error occurred: {e.message}")