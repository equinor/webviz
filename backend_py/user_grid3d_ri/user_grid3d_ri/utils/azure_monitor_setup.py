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

    # Us customized log format for the log strings being sent
    configure_azure_monitor(logging_formatter=logging.Formatter("[%(name)s]: %(message)s"))

    FastAPIInstrumentor.instrument_app(fastapi_app)
    HTTPXClientInstrumentor().instrument()

    # Experiment with instrumenting the gRPC calls as well
    GrpcAioInstrumentorClient().instrument()
