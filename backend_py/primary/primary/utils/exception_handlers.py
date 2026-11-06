import json
import logging
import traceback

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.requests import Request
from fastapi.responses import JSONResponse, Response
from fastapi.utils import is_body_allowed_for_status_code
from opentelemetry import trace
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.status import HTTP_422_UNPROCESSABLE_CONTENT, HTTP_500_INTERNAL_SERVER_ERROR

from webviz_services.service_exceptions import ServiceLayerException

# Setup a dedicated logger for exceptions in the primary module
# Use an unconventional logger name to clearly separate exception logs from other logs
EXCEPTIONS_LOGGER = logging.getLogger("primary.EXCEPTIONS")

# Separator used to frame embedded tracebacks in log messages.
_TRACEBACK_SEPARATOR = "-" * 70


def my_http_exception_handler(request: Request, exc: StarletteHTTPException) -> Response | JSONResponse:
    # Our customized exception handler for FastAPI/Starlette's HTTPException
    # Based on FastAPI's doc, but with logging added
    # See, https://fastapi.tiangolo.com/tutorial/handling-errors/?h=err#override-the-httpexception-error-handler

    # Record the exception on the span
    curr_span = trace.get_current_span()
    curr_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
    curr_span.record_exception(exc)

    # Don't log the full traceback for this class of exceptions, but simply log the location where it was raised.
    # The full traceback can be found in the telemetry since it is recorded on the span.
    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    exc_raise_location = _make_raise_location_string(exc)
    EXCEPTIONS_LOGGER.error(
        f"[EXC] FastAPI HTTP exception in {route} -> {exc_name}: {str(exc)}\n"
        f"Location of HTTP exception:\n  {exc_raise_location}"
    )

    headers = getattr(exc, "headers", None)
    if not is_body_allowed_for_status_code(exc.status_code):
        return Response(status_code=exc.status_code, headers=headers)

    # To be consistent with our other responses we will return the details of the HTTP exception
    # in the error.message field in the JSON response
    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "error": {
                "type": "GeneralError",
                "message": str(exc.detail),
            }
        },
    )


def my_request_validation_error_handler(request: Request, exc: RequestValidationError) -> Response:
    # Our customized exception handler for FastAPI's RequestValidationError that is raised when Pydantic
    # validation detects that a request contains invalid data.

    # Record the full exception on the telemetry span
    curr_span = trace.get_current_span()
    curr_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
    curr_span.record_exception(exc)

    # Try and simplify the errors a little bit by just reporting msg, loc, and input
    # Also try and concatenate the loc array into a string
    # Se Pydantic doc for more details, https://docs.pydantic.dev/latest/errors/errors/
    simplified_err_arr = []
    for err in exc.errors():
        loc = err.get("loc")
        if isinstance(loc, list):
            loc = ",".join(loc)

        # We're seeing some cases where the input is not JSON serializable, so we'll just always convert it to a
        # string to avoid triggering an exception when we try and call json.dumps() further down.
        input_as_str = str(err.get("input"))

        simplified_err_arr.append(
            {
                "msg": err.get("msg"),
                "loc": loc,
                "input": input_as_str,
            }
        )

    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    message = f"{len(simplified_err_arr)} validation error(s): {json.dumps(simplified_err_arr)}"

    EXCEPTIONS_LOGGER.error(f"[EXC] FastAPI validation exception in {route} -> {exc_name}: {message}")

    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": {
                "type": "RequestValidationError",
                "message": message,
            }
        },
    )


def service_layer_exception_handler(request: Request, exc: ServiceLayerException) -> JSONResponse:
    # Record full exception details on the telemetry span
    curr_span = trace.get_current_span()
    curr_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
    curr_span.record_exception(exc)

    # For the logging, the traceback is embedded as text so it shows in the console log.
    # We deliberately don't pass exc_info when logging since that would create an exception entry in
    # telemetry in addition to the one we record on the span.
    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    exc_traceback_str = _format_exception_for_log(exc)
    EXCEPTIONS_LOGGER.error(f"[EXC] Service exception in {route} -> {exc_name}: {str(exc)}\n{exc_traceback_str}")

    return JSONResponse(
        status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "type": exc.get_error_type_str(),
                "message": exc.message,
                "service": exc.service,
            }
        },
    )


def catch_all_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log error with the full exception traceback as a long string here
    # Note that we don't pass exc_info to the logger here, to avoid creating a duplicate exception entry in telemetry.
    #
    # Also note that for the unhandled exceptions, we don't record any exception on the telemetry span, since as of
    # version 1.8.10 of azure-monitor-opentelemetry, the instrumentation for FastApi does this automatically, and
    # there seems to be no readily available way of disabling it in the instrumentation.

    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    exc_traceback_str = _format_exception_for_log(exc)
    EXCEPTIONS_LOGGER.error(f"[EXC] Unhandled exception in {route} -> {exc_name}: {str(exc)}\n{exc_traceback_str}")

    # Don't leak any information to frontend
    return JSONResponse(
        status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "type": "InternalError",
                "message": "Internal server error",
            }
        },
    )


def _get_exception_name(exc: Exception) -> str:
    # Exception name is the name of the exception class
    return exc.__class__.__name__


def _make_route_string(request: Request) -> str:
    # Construct a string representing the HTTP method and the request path for logging purposes.
    # Does not include query parameters or the domain.
    return f"{request.method} {request.url.path}"


def _format_exception_for_log(exc: Exception) -> str:
    # Format the exception as a string suitable for logging.
    # Includes the full traceback surrounded by separator lines so it stands out in the console log.
    # Note that the string returned by format_exception() already ends with a newline.
    traceback_str = "".join(traceback.format_exception(exc))
    return f"{_TRACEBACK_SEPARATOR}\n{traceback_str}{_TRACEBACK_SEPARATOR}"


def _make_raise_location_string(exc: Exception) -> str:
    # Construct a string representing the location where the exception was raised.
    # Returns a single line string with the filename, line number, and function name.
    tb = exc.__traceback__
    frame: traceback.FrameSummary = traceback.extract_tb(tb)[-1]
    return f'file: "{frame.filename}", line: {frame.lineno}, in {frame.name}'


def override_default_fastapi_exception_handlers(app: FastAPI) -> None:
    """
    Override the default exception handlers provided by FastAPI
    """

    # ! Type check is being ignored here because the function type doesn't recognize the extended exceptions.
    # ! Explicitly handling the *Starlette* exception to catch internal errors, as suggested by the FastAPI docs.
    app.add_exception_handler(StarletteHTTPException, my_http_exception_handler)  # type: ignore
    app.add_exception_handler(RequestValidationError, my_request_validation_error_handler)  # type: ignore

    # FastAPI/Starlette does some magic when we add a handler for 500 or Exception where it will install this handler
    # as an outermost catch-all handler for all exceptions that are not handled by other handlers.
    # In Starlette speak this is called an "error_handler", which gets taken aside and is installed on the
    # ServerErrorMiddleware instead of ExceptionMiddleware where all other exceptions go.
    # See:
    #   https://github.com/encode/starlette/blob/6ee94f2cac955eeae68d2898a8dec8cf17b48736/starlette/applications.py#L85-L89
    #   https://github.com/encode/starlette/blob/6ee94f2cac955eeae68d2898a8dec8cf17b48736/starlette/middleware/errors.py#L170-L178
    app.add_exception_handler(Exception, catch_all_exception_handler)


def configure_service_level_exception_handlers(app: FastAPI) -> None:
    """
    Add exception handler for the exceptions that are raised in the service layer
    """
    # ! Type check is being ignored here because the function type doesn't recognize the extended exceptions.
    app.add_exception_handler(ServiceLayerException, service_layer_exception_handler)  # type: ignore
