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
        "offer_throughput": 4000,
        "containers": [
            {"id": "sessions", "partition_key": "/user_id"},
            {"id": "snapshots_metadata", "partition_key": "/user_id"},
            {"id": "snapshots_contents", "partition_key": "/user_id"},
            {"id": "snapshot_access_log", "partition_key": "/user_id"},
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
        db = client.create_database_if_not_exists(db_name, offer_throughput=db_def.get("offer_throughput"))

        for container_def in db_def["containers"]:
            max_attempts = 5
            for attempt in range(1, max_attempts + 1):
                try:
                    db.create_container_if_not_exists(
                        id=container_def["id"],
                        partition_key=PartitionKey(path=container_def["partition_key"]),
                        offer_throughput=container_def.get("throughput"),
                        indexing_policy=container_def.get("indexing_policy"),
                    )
                    LOGGER.info("    ✅ Created container '%s' (attempt %d)", container_def["id"], attempt)
                    break
                except Exception as e:
                    LOGGER.warning(
                        "    ⚠️ Failed to create container '%s' (attempt %d): %s", container_def["id"], attempt, e
                    )
                    if attempt == max_attempts:
                        raise
                    time.sleep(2 * attempt)
            total_containers += 1

    LOGGER.info(
        "✅ Local Cosmos DB emulator setup complete: %d database(s), %d container(s).",
        len(COSMOS_SCHEMA),
        total_containers,
    )
