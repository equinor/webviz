import json
from contextvars import ContextVar

from starlette.datastructures import MutableHeaders
from fastapi import Response
from requests_toolbelt import MultipartEncoder
from starlette.responses import StreamingResponse

# Add warnings to ContextVar
request_context: ContextVar = ContextVar("request_context", default={
    "warnings": []
})

async def inject_context(response: StreamingResponse) -> Response:
    if not hasattr(response, "body_iterator"):
        return response
    
    context = request_context.get()
    warnings = json.dumps(context["warnings"])

    response.headers.append("Warnings", warnings)

def add_warning(message: str):
    context = request_context.get()
    context["warnings"].append(message)
    request_context.set(context)