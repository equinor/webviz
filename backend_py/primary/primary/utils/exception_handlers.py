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
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY, HTTP_500_INTERNAL_SERVER_ERROR

from primary.services.service_exceptions import ServiceLayerException

ROOT_LOGGER = logging.getLogger()


def my_http_exception_handler(request: Request, exc: StarletteHTTPException) -> Response | JSONResponse:
    # Our customized exception handler for FastAPI/Starlette's HTTPException
    # Based on FastAPI's doc, but with logging added
    # See, https://fastapi.tiangolo.com/tutorial/handling-errors/?h=err#override-the-httpexception-error-handler

    # Usually we would pass exc_info to the logger so that the telemetry will see this as an exception.
    # This generates quite a bit of noise in the log, so try an alternative approach where we explicitly
    # record the exception on the telemetry span below instead
    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    exc_location = _get_exception_location(exc)
    # ROOT_LOGGER.error(f"[EXC] FastAPI HTTP exception in {route} -> {exc_name}: {str(exc)}", exc_info=exc)
    ROOT_LOGGER.error(
        f"[EXC] FastAPI HTTP exception in {route} -> {exc_name}: {str(exc)}\n"
        f"Location of HTTP exception:\n  {exc_location}"
    )

    # Try and record the exception on the span
    curr_span = trace.get_current_span()
    curr_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
    curr_span.record_exception(exc)

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

    # Try and simplify the errors a little bit by just reporting msg, loc, and input
    # Also try and concatenate the loc array into a string
    # Se Pydantic doc for more details, https://docs.pydantic.dev/latest/errors/errors/
    simplified_err_arr = []
    for err in exc.errors():
        loc = err.get("loc")
        if type(loc) is list:
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

    # We don't pass along the exception object to the logger here since as of december 2023, the array format of
    # the contained errors seems to cause problems with the telemetry instrumentation.
    ROOT_LOGGER.error(f"[EXC] FastAPI validation exception in {route} -> {exc_name}: {message}")

    # Still, try and record the exception on the telemetry span
    curr_span = trace.get_current_span()
    curr_span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc)))
    curr_span.record_exception(exc)

    return JSONResponse(
        status_code=HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "type": "RequestValidationError",
                "message": message,
            }
        },
    )


def service_layer_exception_handler(request: Request, exc: ServiceLayerException) -> JSONResponse:
    # Log error with the exception message, both for the benefit of the console log itself and to propagate
    # the exception to telemetry. For telemetry, to see this as an exception, exc_info must be passed
    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    ROOT_LOGGER.error(f"[EXC] Service exception in {route} -> {exc_name}: {str(exc)}", exc_info=exc)

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
    # Log error with the exception message + exc_info for the telemetry
    route = _make_route_string(request)
    exc_name = _get_exception_name(exc)
    ROOT_LOGGER.error(f"[EXC] Unhandled exception in {route} -> {exc_name}: {str(exc)}", exc_info=exc)

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
    return f"{request.method} {request.url.path}"


def _get_exception_location(exc: Exception) -> str:
    # Get the last frame where the exception occurred
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
