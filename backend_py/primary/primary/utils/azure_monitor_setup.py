import logging

from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor


# A lot of the configuration will be read from environment variables during the execution of this function.
# Notable environment variables that may be consumed are:
# - APPLICATIONINSIGHTS_CONNECTION_STRING
# - OTEL_RESOURCE_ATTRIBUTES
# - OTEL_SERVICE_NAME
def setup_azure_monitor_telemetry(fastapi_app: FastAPI) -> None:

    # Note that this call will throw an exception if the APPLICATIONINSIGHTS_CONNECTION_STRING
    # environment variable is not set or if it is invalid.
    # Starting with version 1.8.6, the default sampler is RateLimitedSampler. We restore the old behavior by setting the
    # sampling_ratio to 1.0, which restores classic Application Insights sampler.
    configure_azure_monitor(
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
