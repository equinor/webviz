import os
import logging
from dataclasses import dataclass

from azure.identity.aio import DefaultAzureCredential
from azure.identity.aio import ChainedTokenCredential
from azure.identity.aio import ClientSecretCredential

LOGGER = logging.getLogger(__name__)


@dataclass
class ClientSecretVars:
    tenant_id: str
    client_id: str
    client_secret: str


def create_credential_for_azure_services(client_secret_vars_for_local_dev: ClientSecretVars | None) -> DefaultAzureCredential | ChainedTokenCredential:
    """
    Create an Azure credential suitable for authenticating to Azure services such as Service Bus, Cosmos DB, etc.

    Note that client_secret_vars_for_local_dev will only be used when running locally (i.e. not on Radix).
    """
    LOGGER.info("Creating credential for Azure services")

    LOGGER.info(f"Environment var: AZURE_TENANT_ID={os.getenv("AZURE_TENANT_ID")}")
    LOGGER.info(f"Environment var: AZURE_CLIENT_ID={os.getenv("AZURE_CLIENT_ID")}")
    LOGGER.info(f"Environment var: AZURE_CLIENT_SECRET={_show_first_chars_of_secret(os.getenv("AZURE_CLIENT_SECRET"))}")

    # Any better way of knowing if we're running in Radix or locally?
    is_on_radix_platform = os.getenv("RADIX_APP") is not None
    LOGGER.info(f"{is_on_radix_platform=}")

    # Using DefaultAzureCredential it seems that when running locally using docker compose we end up using ClientSecretCredential (via EnvironmentCredential)
    # When running on Radix we end up with a WorkloadIdentityCredential.
    #
    # To avoid having to specifically configure AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET environment
    # variables for local development, try and put an explicitly created ClientSecretCredential first in a
    # ChainedTokenCredential when running locally.

    if not is_on_radix_platform and client_secret_vars_for_local_dev is not None:
        LOGGER.info("Creating credential for Azure services for local development using ClientSecretCredential and DefaultAzureCredential in a ChainedTokenCredential")
        LOGGER.info(f"ClientSecretVars.tenant_id={client_secret_vars_for_local_dev.tenant_id}")
        LOGGER.info(f"ClientSecretVars.client_id={client_secret_vars_for_local_dev.client_id}")
        LOGGER.info(f"ClientSecretVars.client_secret={_show_first_chars_of_secret(client_secret_vars_for_local_dev.client_secret)}")

        credential_for_local_dev = ClientSecretCredential(tenant_id=client_secret_vars_for_local_dev.tenant_id, client_id=client_secret_vars_for_local_dev.client_id, client_secret=client_secret_vars_for_local_dev.client_secret)
        chained_credential = ChainedTokenCredential(credential_for_local_dev, DefaultAzureCredential())
        return chained_credential

    # Disable EnvironmentCredential when running on Radix to avoid ending up with a ClientSecretCredential by accident if
    # the AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET are set in environment for some reason.
    LOGGER.info("Creating credential for Azure services using DefaultAzureCredential (with EnvironmentCredential disabled)")
    return DefaultAzureCredential(exclude_environment_credential=True)


def _show_first_chars_of_secret(secret: str | None, num_chars: int = 4) -> str | None:
    if secret is None:
        return None

    return f"{secret[:num_chars]}..."
