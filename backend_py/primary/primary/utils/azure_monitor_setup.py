import logging

from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.sdk.resources import Resource
from webviz_core_utils.radix_utils import is_running_on_radix_platform
from webviz_core_utils.azure_monitor_destination import AzureMonitorDestination


LOGGER = logging.getLogger(__name__)


def setup_azure_monitor_telemetry_for_primary(fastapi_app: FastAPI) -> None:

    if is_running_on_radix_platform():
        azmon_dest = AzureMonitorDestination.from_radix_env()
    else:
        # For local development and testing of telemetry.
        # Picks up APPLICATIONINSIGHTS_CONNECTION_STRING env variable if it is set, and configures from that.
        azmon_dest = AzureMonitorDestination.for_local_dev(service_name="backend-primary")

    if not azmon_dest:
        LOGGER.warning("Skipping telemetry configuration for primary backend, no valid AzureMonitorDestination")
        return

    LOGGER.info(
        f"Configuring Azure Monitor telemetry for primary backend, resource attributes: {azmon_dest.resource_attributes}"
    )

    # Starting with version 1.8.6, the default sampler is RateLimitedSampler. We restore the old behavior by setting the
    # sampling_ratio to 1.0, which restores classic Application Insights sampler.
    configure_azure_monitor(
        connection_string=azmon_dest.insights_connection_string,
        resource=Resource.create(attributes=azmon_dest.resource_attributes),
        sampling_ratio=1.0,
        logging_formatter=logging.Formatter("[%(name)s]: %(message)s"),
        instrumentation_options={
            "django": {"enabled": False},
            "flask": {"enabled": False},
            "psycopg2": {"enabled": False},
        },
    )

    FastAPIInstrumentor.instrument_app(fastapi_app)

    HTTPXClientInstrumentor().instrument()

    # Should we keep Redis instrumented or does it generate more noise than insights?
    RedisInstrumentor().instrument()
