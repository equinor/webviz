import json
from contextvars import ContextVar

from starlette.datastructures import MutableHeaders

WARNINGS_CONTEXT_DEFAULT = {
    "report_errors_as_warnings": False,
    "reported_warnings": []
}

# Add warnings to ContextVar
warnings_context: ContextVar = ContextVar("warnings_context", default=WARNINGS_CONTEXT_DEFAULT)

def add_warning(warning: str) -> None:
    context = warnings_context.get()
    context["reported_warnings"].append(warning)

class AddWarningsMiddleware:
    """
    Adds a Warnings header to the response containing a JSON array of warnings
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        
        warnings_context.set(WARNINGS_CONTEXT_DEFAULT)

        async def receive_request_with_warnings_request(message) -> None:
            if message["type"] == "http.request":
                headers = MutableHeaders(scope=message)
                context = warnings_context.get()
                allow_warnings = headers.get("Webviz-Allow-Warnings", None)
                if allow_warnings == "true":
                    context["report_errors_as_warnings"] = True
                
                warnings_context.set(context)
            
            await receive(message)

        async def send_with_warning_header(message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                context = warnings_context.get()
                warnings = json.dumps(context["reported_warnings"])
                headers.append("Webviz-Content-Warnings", warnings)

            await send(message)

        await self.app(scope, receive_request_with_warnings_request, send_with_warning_header)