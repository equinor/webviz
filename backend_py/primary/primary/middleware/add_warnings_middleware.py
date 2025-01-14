from typing_extensions import Annotated
import json
from contextvars import ContextVar

from fastapi import Query, HTTPException
from starlette.datastructures import MutableHeaders

# from starlette.requests import HTTPConnection

# Add warnings to ContextVar
warnings_context: ContextVar = ContextVar(
    "warnings_context", default={"report_errors_as_warnings": False, "reported_warnings": []}
)


async def allow_warnings_dep(allow_warnings: Annotated[bool, Query(description="Allow warnings")] = None) -> None:
    if allow_warnings:
        context = warnings_context.get()
        context["report_errors_as_warnings"] = True
        warnings_context.set(context)


def add_warning(warning: str) -> None:
    context = warnings_context.get()
    if context["report_errors_as_warnings"]:
        context["reported_warnings"].append(warning)


def soft_raise_exception(exception: HTTPException) -> None:
    context = warnings_context.get()
    if context["report_errors_as_warnings"]:
        context["reported_warnings"].append(exception.detail)
    else:
        raise exception


class AddWarningsMiddleware:
    """
    Adds a Warnings header to the response containing a JSON array of warnings
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        warnings_context.set({"report_errors_as_warnings": False, "reported_warnings": []})

        """
        conn = HTTPConnection(scope)
        context = warnings_context.get()
        conn.query_params.get("allow_warnings", )
        allow_warnings = conn.headers.get("Webviz-Allow-Warnings", None)
        if allow_warnings == "true":
            context["report_errors_as_warnings"] = True

        warnings_context.set(context)
        """

        async def send_with_warning_header(message) -> None:
            if message["type"] == "http.response.start":
                context = warnings_context.get()
                if len(context["reported_warnings"]) > 0:
                    headers = MutableHeaders(scope=message)
                    warnings = json.dumps(context["reported_warnings"])
                    headers.append("Webviz-Content-Warnings", warnings)

            await send(message)

        await self.app(scope, receive, send_with_warning_header)
