"""
This file is only used for setting up the local database for development and testing purposes.
"""

import logging
import time
from azure.cosmos import CosmosClient, PartitionKey

from primary.config import COSMOS_DB_PROD_CONNECTION_STRING, COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY

LOGGER = logging.getLogger(__name__)

# Declarative schema definition
COSMOS_SCHEMA = [
    {
        "database": "persistence",
        "containers": [
            {"id": "sessions", "partition_key": "/user_id", "throughput": 400},
        ],
    },
]


def wait_for_emulator(uri, key, retries=30, delay=2):
    for attempt in range(retries):
        try:
            client = CosmosClient(uri, key, connection_verify=False)
            client.list_databases()
            LOGGER.info("✅ Cosmos Emulator is responsive.")
            return client
        except Exception as e:  # pylint:disable=broad-except
            LOGGER.warning("⏳ Emulator not ready yet (attempt %d): %s", attempt + 1, e)
            time.sleep(delay)

    raise RuntimeError("❌ Cosmos Emulator did not become ready in time.")


def maybe_setup_local_database():
    if COSMOS_DB_PROD_CONNECTION_STRING:
        LOGGER.info("Using production Cosmos DB - skipping local setup.")
        return
    elif COSMOS_DB_EMULATOR_URI is None or COSMOS_DB_EMULATOR_KEY is None:
        raise ValueError("No Cosmos DB production connection string or emulator URI/key provided.")

    client = wait_for_emulator(COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY)

    total_containers = 0

    for db_def in COSMOS_SCHEMA:
        db_name = db_def["database"]
        LOGGER.info("Creating or getting database: %s", db_name)
        db = client.create_database_if_not_exists(db_name)

        for container_def in db_def["containers"]:
            container_id = container_def["id"]
            partition_key_path = container_def["partition_key"]

            LOGGER.info("  Creating container: %s (Partition Key: %s)", container_id, partition_key_path)
            db.create_container_if_not_exists(
                id=container_id,
                partition_key=PartitionKey(path=partition_key_path),
                offer_throughput=container_def.get("throughput", 400),
                indexing_policy=container_def.get("indexing_policy"),
            )
            total_containers += 1

    LOGGER.info(
        "✅ Local Cosmos DB emulator setup complete: %d database(s), %d container(s).",
        len(COSMOS_SCHEMA),
        total_containers,
    )
