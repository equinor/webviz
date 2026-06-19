"""
This file is only used for setting up the local database for development and testing purposes.
"""

import logging
import time
from typing import List, Dict, Any
import ssl
import urllib.request
from urllib.error import URLError, HTTPError

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


def wait_for_emulator(uri: str, key: str, retries: int = 50, delay: int = 10) -> CosmosClient:
    # Probe the gateway root rather than a specific endpoint so this works across both the legacy
    # emulator and the vnext-preview emulator (which doesn't expose the legacy explorer cert path).
    probe_url = f"{uri.rstrip('/')}/"
    # pylint: disable=protected-access
    # Disabling SSL certificate verification is safe here because this code is used exclusively
    # with the local Cosmos DB Emulator for development and testing. Never use this in production.
    context = ssl._create_unverified_context()  # nosec

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(probe_url, context=context) as response:  # nosec
                if response.status:
                    LOGGER.info("✅ Emulator gateway is up. Proceeding to create CosmosClient.")
                    break
        except HTTPError:
            # The gateway requires authentication, so an unauthenticated probe returns an HTTP error
            # status (e.g. 401). Receiving any HTTP response means the gateway is up and ready.
            LOGGER.info("✅ Emulator gateway is up (responded to probe). Proceeding to create CosmosClient.")
            break
        except URLError as e:
            LOGGER.warning("⏳ Emulator gateway not ready (attempt %d): %s", attempt + 1, e.reason)
        time.sleep(delay)
    else:
        raise RuntimeError("❌ Cosmos Emulator gateway not ready after timeout")

    # Now that we know the gateway is reachable, create the CosmosClient.
    # enable_endpoint_discovery=False keeps the SDK using this explicit endpoint instead of the
    # account's advertised locations (the emulator advertises 127.0.0.1, which isn't reachable from
    # inside the backend container).
    return CosmosClient(uri, key, connection_verify=False, enable_endpoint_discovery=False)


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
    client: CosmosClient = wait_for_emulator(uri, key)

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
