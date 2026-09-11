import os
import logging

from azure.identity.aio import ClientSecretCredential
from azure.identity.aio import WorkloadIdentityCredential
from webviz_core_utils.radix_utils import is_running_on_radix_platform

LOGGER = logging.getLogger(__name__)


def create_credential_for_azure_services() -> WorkloadIdentityCredential | ClientSecretCredential:
    """
    Create an Azure Identity credential suitable for authenticating to Azure services such as Service Bus and Cosmos DB.

    This function returns a credential object that can be passed to Azure SDK clients that support `azure-identity`
    credentials. The chosen credential strategy depends on whether the code is running on the Radix platform or
    locally (developer workstation/docker-compose).
    """
    is_on_radix_platform = is_running_on_radix_platform()

    LOGGER.info(f"Creating credential for use with Azure services ({is_on_radix_platform=})...")

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
    # deterministic behavior and clearer failure modes. For local development, we rely on explicitly creating
    # a ClientSecretCredential for the same reasons.

    tenant_id = os.environ["AZURE_TENANT_ID"]
    client_id = os.environ["AZURE_CLIENT_ID"]

    if is_on_radix_platform:
        LOGGER.info("Creating WorkloadIdentityCredential for Azure services (Radix environment detected)")
        token_file_path = os.environ["AZURE_FEDERATED_TOKEN_FILE"]
        return WorkloadIdentityCredential(tenant_id=tenant_id, client_id=client_id, token_file_path=token_file_path)
    else:
        LOGGER.info("Creating local development credential for Azure services using ClientSecretCredential")
        client_secret = os.environ["AZURE_CLIENT_SECRET"]
        return ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)


def log_azure_credential_env_var_presence() -> None:
    """
    Log the presence of key Azure credential-related environment variables.
    Intended as a debugging aid to diagnose authentication failures against Azure services.
    """
    is_on_radix_platform = is_running_on_radix_platform()
    LOGGER.info(f"Status of Azure credential environment variables (is_on_radix_platform={is_on_radix_platform})")

    # We always need these two to be set
    LOGGER.info(f"  AZURE_TENANT_ID present: {'AZURE_TENANT_ID' in os.environ}")
    LOGGER.info(f"  AZURE_CLIENT_ID present: {'AZURE_CLIENT_ID' in os.environ}")

    # One of the following environment variables needs to be set.
    #  * For Radix deploys, AZURE_FEDERATED_TOKEN_FILE must be set.
    #  * For local development, AZURE_CLIENT_SECRET must be set.
    LOGGER.info(f"  AZURE_FEDERATED_TOKEN_FILE present: {'AZURE_FEDERATED_TOKEN_FILE' in os.environ} (req. for Radix)")
    LOGGER.info(f"  AZURE_CLIENT_SECRET present: {'AZURE_CLIENT_SECRET' in os.environ} (req. for local development)")
