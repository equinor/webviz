from functools import wraps
from contextvars import ContextVar
from typing import Dict, Any

from starlette.datastructures import MutableHeaders
from primary.config import DEFAULT_CACHE_MAX_AGE


# Initialize with a factory function to ensure a new dict for each context
def get_default_context() -> Dict[str, Any]:
    return {"max_age": DEFAULT_CACHE_MAX_AGE}


cache_context: ContextVar[Dict[str, Any]] = ContextVar("cache_context", default=get_default_context())


def add_custom_cache_time(max_age: int):
    """
    Decorator that sets a custom cache time for the endpoint response.

    Args:
        max_age (int): The maximum age in seconds for the cache

    Example:
        @add_custom_cache_time(300)  # Cache for 5 minutes
        async def my_endpoint():
            return {"data": "some_data"}
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):

            # Create a new context dict for this request
            new_context = get_default_context()
            new_context["max_age"] = max_age
            # Store the token to reset later if needed
            cache_context.set(new_context)

            return await func(*args, **kwargs)

        return wrapper

    return decorator


class AddBrowserCacheMiddleware:
    """
    Adds cache-control to the response headers
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        # Set initial context and store token
        token = cache_context.set(get_default_context())

        async def send_with_cache_header(message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                context = cache_context.get()
                cache_control_str = f"max-age={context['max_age']}, private"
                headers.append("cache-control", cache_control_str)

            await send(message)

        try:
            await self.app(scope, receive, send_with_cache_header)
        finally:
            # Reset context after request is complete
            cache_context.reset(token)
