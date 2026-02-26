from __future__ import annotations
import logging
import os
from dataclasses import dataclass
from typing import Mapping

from .radix_utils import get_radix_component_name, get_radix_environment_name, get_radix_short_commit_sha

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, kw_only=True)
class AzureMonitorDestination:
    insights_connection_string: str
    resource_attributes: Mapping[str, str]

    @classmethod
    def from_radix_env(cls) -> AzureMonitorDestination | None:
        service_name = get_radix_component_name()
        service_namespace = get_radix_environment_name()
        if not service_name or not service_namespace:
            # These environment variables are expected to be set in all Radix environments, so log an error if they
            # are missing, but return None to allow the application to continue running without telemetry.
            LOGGER.error("RADIX_COMPONENT and/or RADIX_ENVIRONMENT env variables are not set as expected")
            return None

        service_version = get_radix_short_commit_sha() or "NA"

        # The service_name retrieved from radix will typically be lowercase prod, preprod, dev or review.
        # Convert to uppercase and construct the expected environment variable name for the connection string
        # on the form "WEBVIZ_INSIGHTS_CONNECTIONSTRING_<NAMESPACE>"", e.g. "WEBVIZ_INSIGHTS_CONNECTIONSTRING_PROD"
        env_var_name = f"WEBVIZ_INSIGHTS_CONNECTIONSTRING_{service_namespace.upper()}"
        insights_connection_string = os.getenv(env_var_name)
        if not insights_connection_string:
            # Currently we may not have environment variables set up for all Radix environments, so log a warning if
            # the expected environment variable is missing, but return None to allow the application to continue
            # running without telemetry instead of aborting.
            LOGGER.warning(f"Cannot determine Azure Monitor telemetry destination, env variable {env_var_name} not set")
            return None

        return AzureMonitorDestination(
            insights_connection_string=insights_connection_string,
            resource_attributes={
                "service.name": service_name,
                "service.namespace": service_namespace,
                "service.version": service_version,
            },
        )

    @classmethod
    def for_local_dev(cls, service_name: str) -> AzureMonitorDestination | None:
        connection_string = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING")
        if not connection_string:
            return None

        return cls(
            insights_connection_string=connection_string,
            resource_attributes={
                "service.name": service_name,
                "service.namespace": "local",
                "service.version": "NA",
            },
        )
