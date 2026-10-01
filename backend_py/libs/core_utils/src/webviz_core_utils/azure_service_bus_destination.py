from __future__ import annotations
import logging
from dataclasses import dataclass

from .radix_utils import is_running_on_radix_platform, get_radix_environment_name

LOGGER = logging.getLogger(__name__)

# Domain suffix that turns a bare Service Bus namespace into its fully qualified namespace.
# Azure defines the namespace format as "<yournamespace>.servicebus.windows.net"
_SB_NAMESPACE_FQDN_SUFFIX = ".servicebus.windows.net"


@dataclass(frozen=True, kw_only=True)
class AzureServiceBusDestination:
    sb_namespace: str
    sb_queue_name: str

    @classmethod
    def from_radix_env(cls, base_queue_name: str) -> AzureServiceBusDestination:
        """
        Determine service bus namespace and queue name for the current Radix environment.

        The namespace is chosen by based on environment. Currently, prod gets its own sb namespace while all
        non-prod Radix environments share one sb namespace.

        For example (base_queue_name="default"):
            prod     => namespace: sbns-webviz-prod,    queue: default
            preprod  => namespace: sbns-webviz-nonprod, queue: preprod-default
            review2  => namespace: sbns-webviz-nonprod, queue: review2-default
        """
        is_on_radix_platform = is_running_on_radix_platform()
        if not is_on_radix_platform:
            raise RuntimeError("Not running on the Radix platform.")

        radix_env_name = get_radix_environment_name()
        if radix_env_name is None:
            raise RuntimeError("Could not determine Radix environment name")

        # All non-prod Radix environments (preprod, review*) share one Service Bus namespace, only prod has its own.
        if radix_env_name == "prod":
            sb_namespace = "sbns-webviz-prod"
            sb_queue_name = base_queue_name
        else:
            sb_namespace = "sbns-webviz-nonprod"
            sb_queue_name = f"{radix_env_name}-{base_queue_name}"

        return AzureServiceBusDestination(sb_namespace=sb_namespace, sb_queue_name=sb_queue_name)


def ensure_fq_sb_namespace(sb_namespace: str) -> str:
    """
    Return the fully qualified Service Bus namespace, appending the suffix only if missing.
    A fully qualified namespace is on the form: "<yournamespace>.servicebus.windows.net".
    """
    if sb_namespace.endswith(_SB_NAMESPACE_FQDN_SUFFIX):
        return sb_namespace

    return sb_namespace + _SB_NAMESPACE_FQDN_SUFFIX
