import json
from contextvars import ContextVar

from starlette.datastructures import MutableHeaders

# Add warnings to ContextVar
request_context: ContextVar = ContextVar("request_context", default={
    "warnings": []
})

def add_warning(warning: str) -> None:
    context = request_context.get()
    context["warnings"].append(warning)

class AddWarningsMiddleware:
    """
    Adds a Warnings header to the response containing a JSON array of warnings
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        
        request_context.set({"warnings": []})

        async def send_with_warning_header(message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                context = request_context.get()
                warnings = json.dumps(context["warnings"])
                headers.append("Warnings", warnings)

            await send(message)

        await self.app(scope, receive, send_with_warning_header)