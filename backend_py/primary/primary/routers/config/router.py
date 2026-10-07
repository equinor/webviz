import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from webviz_core_utils.azure_monitor_destination import AzureMonitorDestination
from webviz_core_utils.radix_utils import is_running_on_radix_platform
from webviz_core_utils.radix_utils import get_radix_environment_name, get_radix_short_commit_sha
from webviz_core_utils.pseudonymize import pseudonymize_user_id

from primary import config
from primary.auth.auth_helper import AuthenticatedUser, AuthHelper

LOGGER = logging.getLogger(__name__)

router = APIRouter()


class TelemetryConfig(BaseModel):
    insights_connection_string: str
    radix_environment: str
    commit_sha: str
    user_pseudonym: str | None = None


@router.get("/telemetry")
async def get_telemetry_config(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> TelemetryConfig:

    # The user pseudonym here matches the one we use in the backend when enriching spans
    user_pseudonym = None
    if config.PSEUDONYM_HMAC_KEY:
        user_pseudonym = pseudonymize_user_id(config.PSEUDONYM_HMAC_KEY, authenticated_user.get_user_id())

    is_on_radix_platform = is_running_on_radix_platform()

    # Reuse the backend's telemetry destination so the frontend gets the same app insights connection string
    if is_on_radix_platform:
        azmon_dest = AzureMonitorDestination.from_radix_env()
    else:
        azmon_dest = AzureMonitorDestination.for_local_dev(service_name="frontend")

    insights_connection_string = azmon_dest.insights_connection_string if azmon_dest else None
    if not insights_connection_string:
        raise HTTPException(status_code=500, detail="No Application Insights connection string configured in backend")

    if is_on_radix_platform:
        radix_environment = get_radix_environment_name() or "UnknownRadixEnv"
        commit_sha = get_radix_short_commit_sha() or "UnknownRadixCommitSha"
    else:
        radix_environment = "local"
        commit_sha = "sha_dev"

    return TelemetryConfig(
        insights_connection_string=insights_connection_string,
        radix_environment=radix_environment,
        commit_sha=commit_sha,
        user_pseudonym=user_pseudonym,
    )
