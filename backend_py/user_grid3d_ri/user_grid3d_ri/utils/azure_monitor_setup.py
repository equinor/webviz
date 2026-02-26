import logging

from fastapi import FastAPI
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.grpc import GrpcAioInstrumentorClient
from opentelemetry.sdk.resources import Resource
from webviz_core_utils.radix_utils import is_running_on_radix_platform
from webviz_core_utils.azure_monitor_destination import AzureMonitorDestination


LOGGER = logging.getLogger(__name__)


def setup_azure_monitor_telemetry_for_user_grid3d_ri(fastapi_app: FastAPI) -> None:

    # Due to our default log level of DEBUG, these loggers become quite noisy, so limit them to INFO or WARNING
    logging.getLogger("urllib3").setLevel(logging.INFO)
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
    logging.getLogger("azure.monitor.opentelemetry").setLevel(logging.INFO)
    logging.getLogger("azure.monitor.opentelemetry.exporter").setLevel(logging.WARNING)

    if is_running_on_radix_platform():
        azmon_dest = AzureMonitorDestination.from_radix_env()
    else:
        # For local development and testing of telemetry.
        # Picks up APPLICATIONINSIGHTS_CONNECTION_STRING env variable if it is set, and configures from that.
        azmon_dest = AzureMonitorDestination.for_local_dev(service_name="user-grid3d-ri")

    if not azmon_dest:
        LOGGER.warning("Skipping telemetry configuration for user-grid3d-ri, no valid AzureMonitorDestination")
        return

    LOGGER.info(
        f"Configuring Azure Monitor telemetry for user-grid3d-ri, resource attributes: {azmon_dest.resource_attributes}"
    )

    # Starting with version 1.8.6, the default sampler is RateLimitedSampler. We restore the old behavior by setting the
    # sampling_ratio to 1.0, which restores classic Application Insights sampler.
    configure_azure_monitor(
        connection_string=azmon_dest.insights_connection_string,
        resource=Resource.create(attributes=azmon_dest.resource_attributes),
        sampling_ratio=1.0,
        logging_formatter=logging.Formatter("[%(name)s]: %(message)s"),
    )

    FastAPIInstrumentor.instrument_app(fastapi_app)
    HTTPXClientInstrumentor().instrument()

    # Experiment with instrumenting the gRPC calls as well
    GrpcAioInstrumentorClient().instrument()
