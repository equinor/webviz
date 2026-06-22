"""
This file is only used for setting up the local database for development and testing purposes.
"""

import logging
import time
from typing import List, Dict, Any

from azure.cosmos import CosmosClient, PartitionKey, DatabaseProxy

LOGGER = logging.getLogger(__name__)

# Declarative schema definition
COSMOS_SCHEMA: List[Dict[str, Any]] = [
    {
        "database": "persistence",
        "offer_throughput": 4000,
        "containers": [
            {"id": "sessions", "partition_key": "/owner_id"},
            {"id": "snapshots", "partition_key": "/id"},
            {"id": "snapshot_access_logs", "partition_key": "/visitor_id"},
        ],
    },
]


def create_database_with_retry(client: CosmosClient, db_def: Dict[str, Any], max_attempts: int = 5) -> DatabaseProxy:
    db_name: str = db_def["database"]
    for attempt in range(1, max_attempts + 1):
        try:
            return client.create_database_if_not_exists(db_name, offer_throughput=db_def.get("offer_throughput"))
        # pylint: disable=broad-except
        except Exception as error:
            LOGGER.warning("⚠️ Failed to create database '%s' (attempt %d): %s", db_name, attempt, error)
            if attempt == max_attempts:
                raise
            time.sleep(2 * attempt)

    raise RuntimeError(f"Failed to create database '{db_name}' after {max_attempts} attempts.")


def maybe_setup_local_database(uri: str, key: str) -> None:
    # Disable endpoint discovery: the emulator advertises its location as 127.0.0.1, which the SDK
    # would otherwise route to instead of the provided container-network URI (e.g. cosmos-db-emulator).
    client: CosmosClient = CosmosClient(uri, key, enable_endpoint_discovery=False)

    total_containers = 0

    for db_def in COSMOS_SCHEMA:
        database: DatabaseProxy = create_database_with_retry(client, db_def)

        for container_def in db_def["containers"]:
            max_attempts = 5
            for attempt in range(1, max_attempts + 1):
                try:
                    database.create_container_if_not_exists(
                        id=container_def["id"],
                        partition_key=PartitionKey(path=container_def["partition_key"]),
                        offer_throughput=container_def.get("throughput"),
                        indexing_policy=container_def.get("indexing_policy"),
                    )
                    LOGGER.info("    ✅ Created container '%s' (attempt %d)", container_def["id"], attempt)
                    break
                # pylint: disable=broad-except
                except Exception as error:
                    LOGGER.warning(
                        "    ⚠️ Failed to create container '%s' (attempt %d): %s", container_def["id"], attempt, error
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
