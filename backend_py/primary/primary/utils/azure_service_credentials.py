import os
import logging
from dataclasses import dataclass

from azure.identity.aio import DefaultAzureCredential
from azure.identity.aio import ChainedTokenCredential
from azure.identity.aio import ClientSecretCredential
from azure.identity.aio import WorkloadIdentityCredential


LOGGER = logging.getLogger(__name__)


@dataclass
class ClientSecretVars:
    tenant_id: str
    client_id: str
    client_secret: str


def create_credential_for_azure_services(
    secret_vars_for_local_dev: ClientSecretVars | None,
) -> WorkloadIdentityCredential | ChainedTokenCredential:
    """
    Create an Azure Identity credential suitable for authenticating to Azure services such as Service Bus and Cosmos DB.

    This function returns a credential object that can be passed to Azure SDK clients that support `azure-identity`
    credentials. The chosen credential strategy depends on whether the code is running on the Radix platform or
    locally (developer workstation/docker-compose).

    Note that secret_vars_for_local_dev will only be used when running locally (i.e. not on Radix).
    """
    # Any better way of knowing if we're running in Radix or locally?
    is_on_radix_platform = os.getenv("RADIX_APP") is not None

    LOGGER.info(f"Creating credential for use with Azure services ({is_on_radix_platform=})...")

    LOGGER.info(f"Env.AZURE_TENANT_ID: {_secret_status(os.getenv("AZURE_TENANT_ID"))}")
    LOGGER.info(f"Env.AZURE_CLIENT_ID: {_secret_status(os.getenv("AZURE_CLIENT_ID"))}")
    LOGGER.info(f"Env.AZURE_FEDERATED_TOKEN_FILE: {_secret_status(os.getenv("AZURE_FEDERATED_TOKEN_FILE"))}")
    LOGGER.info(f"Env.AZURE_CLIENT_SECRET: {_secret_status(os.getenv("AZURE_CLIENT_SECRET"))}")

    # DefaultAzureCredential performs implicit credential discovery and may select different authentication mechanisms
    # depending on the runtime environment. This is convenient but can obscure which credential is actually being used
    # and make authentication failures harder to understand and debug.
    #
    # In practice we have observed:
    # - Local development with docker compose typically resolves to ClientSecretCredential via EnvironmentCredential.
    # - A properly configured Radix component (see https://radix.equinor.com/guides/workload-identity/) resolves
    #   to WorkloadIdentityCredential, which is what we want and expect.
    #
    # In Radix production we therefore explicitly create a WorkloadIdentityCredential which should give more
    # deterministic behavior and clearer failure modes.

    if is_on_radix_platform:
        LOGGER.info("Creating WorkloadIdentityCredential for Azure services (Radix environment detected)")
        tenant_id = os.getenv("AZURE_TENANT_ID")
        client_id = os.getenv("AZURE_CLIENT_ID")
        token_file_path = os.getenv("AZURE_FEDERATED_TOKEN_FILE")
        return WorkloadIdentityCredential(tenant_id=tenant_id, client_id=client_id, token_file_path=token_file_path)

    # For local development, we will basically rely on DefaultAzureCredential, but to avoid always having to
    # specifically configure AZURE_TENANT_ID, AZURE_CLIENT_ID and AZURE_CLIENT_SECRET environment variables,
    # we insert an explicitly created ClientSecretCredential first in a ChainedTokenCredential.
    if secret_vars_for_local_dev is not None:
        LOGGER.info("Creating local development credential for Azure services using ChainedTokenCredential")
        LOGGER.info(f"ClientSecretVars.tenant_id: {_secret_status(secret_vars_for_local_dev.tenant_id)}")
        LOGGER.info(f"ClientSecretVars.client_id: {_secret_status(secret_vars_for_local_dev.client_id)}")
        LOGGER.info(f"ClientSecretVars.client_secret: {_secret_status(secret_vars_for_local_dev.client_secret)}")

        client_secret_credential = ClientSecretCredential(
            tenant_id=secret_vars_for_local_dev.tenant_id,
            client_id=secret_vars_for_local_dev.client_id,
            client_secret=secret_vars_for_local_dev.client_secret,
        )
        return ChainedTokenCredential(client_secret_credential, DefaultAzureCredential())

    # Just rely on the default behavior of DefaultAzureCredential for local dev if explicit secrets are not provided
    LOGGER.info("Creating local development credential for Azure services using DefaultAzureCredential")
    return DefaultAzureCredential()


def _secret_status(secret: str | None) -> str:
    if secret is None:
        return "missing"
    if not secret:
        return "empty"

    return "present"


def _show_start_of_secret(secret: str | None, num_chars: int = 4) -> str | None:
    if secret is None:
        return None

    return f"{secret[:num_chars]}..."
