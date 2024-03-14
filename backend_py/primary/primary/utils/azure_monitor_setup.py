import logging
from azure.monitor.opentelemetry import configure_azure_monitor
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk._logs import LoggingHandler


# This is a custom logging handler that does formatting of log messages before passing them on to open telemetry.
# Note that the class we're inheriting from here *is* an OpenTelemetry derived Python logger.
class LoggingHandlerWithFormatting(LoggingHandler):
    def emit(self, record: logging.LogRecord) -> None:
        # Do a bit of a hack here to format the message before passing it onwards.
        # At the same time make sure we restore record.msg in case there are other handlers in the chain.
        original_msg = record.msg
        original_args = record.args

        formatted_msg = self.format(record)
        record.msg = formatted_msg
        record.args = None

        # Note that the logger that we're calling emit on here is an Open Telemetry Logger, not a Python logger.
        self._logger.emit(self._translate(record))

        # For inspecting and debugging the actual telemetry payload, uncomment the following lines.
        # log_record_as_json = self._translate(record).to_json()
        # print(f"---- start payload ----\n{log_record_as_json}\n---- end payload -----", flush=True)

        record.msg = original_msg
        record.args = original_args


# A lot of the configuration will be read from environment variables during the execution of this function.
# Notable environment variables that are consumed are:
# - APPLICATIONINSIGHTS_CONNECTION_STRING
# - OTEL_SERVICE_NAME
# - OTEL_RESOURCE_ATTRIBUTES
def setup_azure_monitor_telemetry(fastapi_app: FastAPI) -> None:
    # Under ideal circumstances, the below call to configure_azure_monitor() should be the only call needed
    # to configure the entire telemetry stack. However, it seems that there are multiple glitches.
    # - Supposedly, FastAPI instrumentation should be added automatically, but this only seems to work
    #   if the call to configure_azure_monitor() happens very early in the module loading process, and
    #   specifically it seems that it has to happen before any import of FastAPIP
    # - The default log handler that is added does not obey the specified log message format string,
    #   even if it is set using OTEL_PYTHON_LOG_FORMAT. It justs logs the raw message string.
    #
    # Note that this call will throw an exception if the APPLICATIONINSIGHTS_CONNECTION_STRING
    # environment variable is not set or if it is invalid
    configure_azure_monitor()

    # The log handler that is added by configure_azure_monitor() does not obey the specified log message
    # format string. We therefore replace it with a custom handler that does formatting and set a format string that ensures
    # that the logger name is included in the log message.
    handler_with_formatting = LoggingHandlerWithFormatting()
    handler_with_formatting.setFormatter(logging.Formatter("[%(name)s] %(message)s"))

    root_logger = logging.getLogger()

    handler_installed_by_config = root_logger.handlers[-1]
    root_logger.removeHandler(handler_installed_by_config)
    root_logger.addHandler(handler_with_formatting)

    FastAPIInstrumentor.instrument_app(fastapi_app)
