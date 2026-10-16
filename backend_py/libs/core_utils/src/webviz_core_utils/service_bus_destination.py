from __future__ import annotations
import logging
import os
from dataclasses import dataclass

from .radix_utils import get_radix_environment_name

LOGGER = logging.getLogger(__name__)

# Domain suffix that turns a bare Service Bus namespace into its fully qualified namespace.
# Azure defines the namespace format as "<yournamespace>.servicebus.windows.net"
_SB_NAMESPACE_FQDN_SUFFIX = ".servicebus.windows.net"


@dataclass(frozen=True, kw_only=True)
class ServiceBusDestination:
    """
    Helpers for deriving Azure Service Bus namespace and queue names.

    SB namespace
        Radix prod        => sbns-webviz-prod
        Radix non-prod    => sbns-webviz-nonprod   (shared by preprod, review*)
        local development => sbns-webviz-local

    SB queue name
        A queue is identified by its environment-agnostic queue_role (e.g. "default", "surface-query").
        For shared SB namespaces, the physical queue name is derived by prefixing the role so a shared namespace can
        contain one queue per environment/developer:

        Radix prod        => <queue_role>                       e.g. "default"
        Radix non-prod    => <radix_env>-<queue_role>           e.g. "review2-default"
        local development => <developer_qualifier>-<queue_role> e.g. "sigurd-default"

    developer_qualifier (supplied via the WEBVIZ_LOCAL_DEVELOPER_QUALIFIER environment variable) is a short,
    alphanumeric string (typically a developer's first name) used only in local development to scope each developer's
    queues within the shared SB namespace.

    Local development can instead use the Service Bus emulator. When WEBVIZ_SERVICE_BUS_EMULATOR_CONNECTION_STRING
    is set, the connection will be made via that connection string (no authentication, no namespace).
    """

    queue_name: str
    namespace: str
    emulator_connection_string: str | None = None

    @classmethod
    def from_radix_env(cls, queue_role: str) -> ServiceBusDestination:
        """
        Determine service bus namespace and queue name for the current Radix environment.

        The namespace is chosen based on the Radix environment. Currently, prod gets its own SB namespace while all
        non-prod Radix environments share one sb namespace.

        For example (queue_role="default"):
            prod     => namespace: sbns-webviz-prod,    queue: default
            preprod  => namespace: sbns-webviz-nonprod, queue: preprod-default
            review2  => namespace: sbns-webviz-nonprod, queue: review2-default
        """
        radix_env_name = get_radix_environment_name()
        if radix_env_name is None:
            raise RuntimeError("Could not determine Radix environment name, must be running on Radix platform.")

        # All non-prod Radix environments (preprod, review*) share one Service Bus namespace
        # Production (prod) has its own separate namespace.
        if radix_env_name == "prod":
            sb_namespace = "sbns-webviz-prod"
            sb_queue_name = queue_role
        else:
            sb_namespace = "sbns-webviz-nonprod"
            sb_queue_name = f"{radix_env_name}-{queue_role}"

        return ServiceBusDestination(namespace=sb_namespace, queue_name=sb_queue_name)

    @classmethod
    def for_local_dev(cls, queue_role: str) -> ServiceBusDestination:
        """
        Determine the service bus destination for local development.

        If WEBVIZ_SERVICE_BUS_EMULATOR_CONNECTION_STRING is set, it will take precedence.
        In this case the connection will be made using that connection string without needing a namespace.
        See the emulator configuration (SbEmulatorConfig.json) for the set of available queues.

        Otherwise all developers share the "sbns-webviz-local" SB namespace, and the queue name is scoped per developer
        by prefixing the queue role with the developer qualifier (WEBVIZ_LOCAL_DEVELOPER_QUALIFIER env variable).
        Note that for this to work the queue must already exist in the shared SB namespace.
        For example:
            queue_role="default", WEBVIZ_LOCAL_DEVELOPER_QUALIFIER="sigurd" => namespace: sbns-webviz-local, queue: sigurd-default
        """
        emulator_connection_string = os.environ.get("WEBVIZ_SERVICE_BUS_EMULATOR_CONNECTION_STRING")
        if emulator_connection_string:
            return ServiceBusDestination(
                queue_name=queue_role,
                namespace="NotInUseForEmulator",
                emulator_connection_string=emulator_connection_string,
            )

        developer_qualifier = os.environ.get("WEBVIZ_LOCAL_DEVELOPER_QUALIFIER")
        if not developer_qualifier:
            raise RuntimeError(
                "Environment variable WEBVIZ_LOCAL_DEVELOPER_QUALIFIER must be set for local development."
            )

        return ServiceBusDestination(
            namespace="sbns-webviz-local",
            queue_name=f"{developer_qualifier}-{queue_role}",
        )


def ensure_fq_sb_namespace(sb_namespace: str) -> str:
    """
    Return the fully qualified Service Bus namespace, appending the suffix only if missing.
    A fully qualified namespace is on the form: "<yournamespace>.servicebus.windows.net".
    """
    if sb_namespace.endswith(_SB_NAMESPACE_FQDN_SUFFIX):
        return sb_namespace

    return sb_namespace + _SB_NAMESPACE_FQDN_SUFFIX
