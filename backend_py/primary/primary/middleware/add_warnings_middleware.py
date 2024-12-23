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

    chunks = []
    async for chunk in response.body_iterator:
        chunks.append(chunk)

    response_body = b"".join(chunks)
    
    m = MultipartEncoder(
        fields={
            "warnings": json.dumps(context["warnings"]),
            "data": response_body
        },
        boundary="----WebKitFormBoundary7MA4YWxkTrZu0gW",
        encoding="utf-8"
    )

    headers = MutableHeaders(raw=response.raw_headers)
    headers["Content-Type"] = m.content_type
    del headers["Content-Length"]

    return Response(content=m.to_string(), media_type=m.content_type, status_code=response.status_code, headers=headers)

def add_warning(message: str):
    context = request_context.get()
    context["warnings"].append(message)
    request_context.set(context)