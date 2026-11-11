import json
from contextvars import ContextVar
from typing import Any, Sequence, TypeVar

from fastapi import HTTPException
from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from webviz_core_utils.text_warning import TextWarning
from webviz_core_utils.result_with_warning import ResultWithWarning

ALLOW_WARNINGS_REQUEST_HEADER = "Webviz-Allow-Warnings"
WARNINGS_RESPONSE_HEADER = "Webviz-Content-Warnings"

# Per-request state. A fresh dict is set by the middleware for every http request.
_warnings_context: ContextVar[dict[str, Any] | None] = ContextVar("warnings_context", default=None)


_T = TypeVar("_T")


def _warnings_to_exception(warnings: Sequence[TextWarning]) -> HTTPException:
    """
    Exception for a non-empty list of warnings, with all warnings concatenated into
    the detail.
    """
    if not warnings:
        raise ValueError("Expect non-empty list of warnings")
    return HTTPException(status_code=500, detail="; ".join(str(w) for w in warnings))


def report_warnings(warnings: Sequence[TextWarning]) -> None:
    """
    Report all warnings to the client if it allows warnings.
    Otherwise raise an HTTPException with all warnings concatenated in the detail.
    """
    if not warnings:
        return

    context = _warnings_context.get()

    if context is not None and context["allow_warnings"]:
        context["warnings"].extend([str(w) for w in warnings])
        return

    raise _warnings_to_exception(warnings)


def unwrap_and_report_warnings(result_with_warning: ResultWithWarning[_T]) -> _T:
    """
    Same as report_warnings(), but for a ResultWithWarning, which is unwrapped
    and its value returned.
    """
    report_warnings(result_with_warning.get_warnings())
    return result_with_warning.get_value()


class AddWarningsMiddleware:
    """
    Lets endpoints report warnings alongside successful data.

    `unwrap_and_report_warnings()` (for a `ResultWithWarning`) and `report_warnings()` (for a list of
    `TextWarning`) are the entry points for reporting warnings. Warnings are reported to the client if it opted in,
    otherwise an `HTTPException` with all warnings concatenated is raised. Free-form string warnings and
    endpoint-level "soft" HTTP exceptions (`add_warning`, `soft_raise_exception`) were deliberately removed.

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
