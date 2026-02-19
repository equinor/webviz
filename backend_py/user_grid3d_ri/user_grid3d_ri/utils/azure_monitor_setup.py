import logging

from fastapi import FastAPI

from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.grpc import GrpcAioInstrumentorClient


# A lot of the configuration will be read from environment variables during the execution of this function.
# Notable environment variables that may be consumed are:
# - APPLICATIONINSIGHTS_CONNECTION_STRING
# - OTEL_RESOURCE_ATTRIBUTES
# - OTEL_SERVICE_NAME
def setup_azure_monitor_telemetry(fastapi_app: FastAPI) -> None:

    # Due to our default log level of DEBUG, these loggers become quite noisy, so limit them to INFO or WARNING
    logging.getLogger("urllib3").setLevel(logging.INFO)
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
    logging.getLogger("azure.monitor.opentelemetry").setLevel(logging.INFO)
    logging.getLogger("azure.monitor.opentelemetry.exporter").setLevel(logging.WARNING)

    # Note that this call will throw an exception if the APPLICATIONINSIGHTS_CONNECTION_STRING
    # environment variable is not set or if it is invalid.
    # Starting with version 1.8.6, the default sampler is RateLimitedSampler. We restore the old behavior by setting the
    # sampler to "microsoft.fixed_percentage" with sampler_arg of 1.0, which means that we sample 100% of the traces.
    configure_azure_monitor(
        sampler="microsoft.fixed_percentage",
        sampler_arg=1.0,
        logging_formatter=logging.Formatter("[%(name)s]: %(message)s"))

    FastAPIInstrumentor.instrument_app(fastapi_app)
    HTTPXClientInstrumentor().instrument()

    # Experiment with instrumenting the gRPC calls as well
    GrpcAioInstrumentorClient().instrument()
