"""
This file is only used for setting up the local database for development and testing purposes.
"""

import logging
import time
from typing import Optional, List, Dict, Any
import ssl
import urllib.request
from urllib.error import URLError

from azure.cosmos import CosmosClient, PartitionKey, DatabaseProxy

from primary.config import COSMOS_DB_PROD_CONNECTION_STRING, COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY

LOGGER = logging.getLogger(__name__)

# Declarative schema definition
COSMOS_SCHEMA: List[Dict[str, Any]] = [
    {
        "database": "persistence",
        "offer_throughput": 4000,
        "containers": [
            {"id": "sessions", "partition_key": "/owner_id"},
            {"id": "snapshots_metadata", "partition_key": "/owner_id"},
            {"id": "snapshots_content", "partition_key": "/snapshot_id"},
            {"id": "snapshot_access_log", "partition_key": "/visitor_id"},
        ],
    },
]


def wait_for_emulator(uri: str, key: str, retries: int = 50, delay: int = 10) -> CosmosClient:
    probe_url = f"{uri.rstrip('/')}/_explorer/emulator.pem"
    context = ssl._create_unverified_context()

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(probe_url, context=context) as response:
                if response.status == 200:
                    LOGGER.info("✅ Emulator HTTPS endpoint is up. Proceeding to create CosmosClient.")
                    break
        except URLError as e:
            LOGGER.warning("⏳ Emulator cert endpoint not ready (attempt %d): %s", attempt + 1, e.reason)
        time.sleep(delay)
    else:
        raise RuntimeError("❌ Cosmos Emulator certificate endpoint not ready after timeout")

    # Now that we know HTTPS works, create the CosmosClient
    return CosmosClient(uri, key, connection_verify=False)


def create_database_with_retry(client: CosmosClient, db_def: Dict[str, Any], max_attempts: int = 5) -> DatabaseProxy:
    db_name: str = db_def["database"]
    for attempt in range(1, max_attempts + 1):
        try:
            return client.create_database_if_not_exists(db_name, offer_throughput=db_def.get("offer_throughput"))
        except Exception as error:
            LOGGER.warning("⚠️ Failed to create database '%s' (attempt %d): %s", db_name, attempt, error)
            if attempt == max_attempts:
                raise
            time.sleep(2 * attempt)

    raise RuntimeError(f"Failed to create database '{db_name}' after {max_attempts} attempts.")


def maybe_setup_local_database() -> None:
    if COSMOS_DB_PROD_CONNECTION_STRING:
        LOGGER.info("Using production Cosmos DB - skipping local setup.")
        return

    if COSMOS_DB_EMULATOR_URI is None or COSMOS_DB_EMULATOR_KEY is None:
        raise ValueError("No Cosmos DB production connection string or emulator URI/key provided.")

    client: CosmosClient = wait_for_emulator(COSMOS_DB_EMULATOR_URI, COSMOS_DB_EMULATOR_KEY)

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
