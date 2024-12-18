from contextvars import ContextVar

from starlette.datastructures import MutableHeaders
from primary.config import DEFAULT_CACHE_MAX_AGE

# Use a context var to store any custom cache time set for a given endpoint
cache_context: ContextVar = ContextVar("max_age", default=DEFAULT_CACHE_MAX_AGE)


def add_custom_cache_time(max_age: int):
    """
    Use this function in an endpoint to set a custom cache time for the response
    """
    context = cache_context.get()
    context["max_age"] = max_age
    cache_context.set(context)


class AddBrowserCacheMiddleware:
    """
    Adds cache-control to the response headers
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        cache_context.set({"max_age": DEFAULT_CACHE_MAX_AGE})

        async def send_with_cache_header(message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                context = cache_context.get()
                cache_control_str = f"max-age={context['max_age']}, private"
                headers.append("cache-control", cache_control_str)

            await send(message)

        await self.app(scope, receive, send_with_cache_header)
