import json
from contextvars import ContextVar
from typing import Any, TypeVar

from fastapi import HTTPException
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from webviz_core_utils.result_warning import ResultWarning
from webviz_core_utils.result_with_warnings import ResultWithWarnings
from webviz_services.service_warnings import ServiceLayerWarning, service_layer_warning_to_exception

ALLOW_WARNINGS_REQUEST_HEADER = "Webviz-Allow-Warnings"
WARNINGS_RESPONSE_HEADER = "Webviz-Content-Warnings"

# Per-request state. A fresh dict is set by the middleware for every http request.
_warnings_context: ContextVar[dict[str, Any] | None] = ContextVar("warnings_context", default=None)


_T = TypeVar("_T")


def _warnings_to_exception(warnings: list[ResultWarning]) -> Exception | None:
    """
    Exception for the warnings, or None if there are no warnings. Only the first warning is converted, mirroring
    the previous behavior where the first error raised, and avoiding huge messages for long warning lists.
    """
    if not warnings:
        return None

    warning = warnings[0]
    if isinstance(warning, ServiceLayerWarning):
        return service_layer_warning_to_exception(warning)

    # Generic warnings are not tied to the service layer, so they have no service exception
    return HTTPException(status_code=500, detail=str(warning))


def resolve_warnings(result_with_warnings: ResultWithWarnings[_T]) -> _T:
    """
    Report all warnings to the client and return the result if the client allows warnings.
    Otherwise raise the exception for the first warning: the service layer exception for a ServiceLayerWarning,
    or an HTTPException for any other ResultWarning.
    """
    context = _warnings_context.get()
    if context is not None and context["allow_warnings"]:
        return result_with_warnings.handle(lambda warnings: context["warnings"].extend(str(w) for w in warnings))
    return result_with_warnings.get_value_or_throw(_warnings_to_exception)


class AddWarningsMiddleware:
    """
    Lets endpoints report warnings alongside successful data.

    `resolve_warnings()` is the only entry point for reporting warnings. It takes a
    `ResultWithWarnings` (holding `ResultWarning`s): warnings are reported to the client if it opted in,
    otherwise the first warning is raised as an exception (service-layer exception for a `ServiceLayerWarning`). Free-form string warnings and endpoint-level
    "soft" HTTP exceptions (`add_warning`, `soft_raise_exception`) were deliberately removed.

    Clients opt in with the request header `Webviz-Allow-Warnings: true`. Warnings added during the
    request are returned as a JSON array in the `Webviz-Content-Warnings` response header.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        allow_header = Headers(scope=scope).get(ALLOW_WARNINGS_REQUEST_HEADER, "")
        context: dict[str, Any] = {"allow_warnings": allow_header.lower() == "true", "warnings": []}
        _warnings_context.set(context)

        async def send_with_warnings_header(message: Message) -> None:
            if message["type"] == "http.response.start" and context["warnings"]:
                headers = MutableHeaders(scope=message)
                headers.append(WARNINGS_RESPONSE_HEADER, json.dumps(context["warnings"], ensure_ascii=True))

            await send(message)

        await self.app(scope, receive, send_with_warnings_header)
