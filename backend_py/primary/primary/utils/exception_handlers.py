import json
import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.utils import is_body_allowed_for_status_code
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY, HTTP_500_INTERNAL_SERVER_ERROR

from primary.services.service_exceptions import ServiceLayerException


def my_http_exception_handler(request: Request, exc: StarletteHTTPException) -> Response | JSONResponse:
    # Our customized exception handler for FastAPI/Starlette's HTTPException
    # Based on FastAPI's doc, but with logging added
    # See, https://fastapi.tiangolo.com/tutorial/handling-errors/?h=err#override-the-httpexception-error-handler

    logging.getLogger().error(f"FastAPI exception {exc.__class__.__name__}: {str(exc)}", exc_info=exc)

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

    message = f"{len(simplified_err_arr)} validation error(s): {json.dumps(simplified_err_arr)}"

    # We don't pass along the exception object to the logger here since as of december 2023, the array format of
    # the contained errors seems to cause problems with hte telemetry instrumentation.
    logging.getLogger().error(f"FastAPI exception {exc.__class__.__name__}: {message}")

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
    logging.getLogger().error(f"Service exception {exc.get_error_type_str()}: {str(exc)}", exc_info=exc)

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


def override_default_fastapi_exception_handlers(app: FastAPI) -> None:
    """
    Override the default exception handlers provided by FastAPI
    """
    app.add_exception_handler(StarletteHTTPException, my_http_exception_handler)
    app.add_exception_handler(RequestValidationError, my_request_validation_error_handler)


def configure_service_level_exception_handlers(app: FastAPI) -> None:
    """
    Add exception handler for the exceptions that are raised in the service layer
    """
    app.add_exception_handler(ServiceLayerException, service_layer_exception_handler)
