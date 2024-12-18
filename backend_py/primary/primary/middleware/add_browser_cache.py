from functools import wraps
from contextvars import ContextVar
from typing import Dict, Any, Callable, Awaitable, Union, Never

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Scope, Receive, Send, Message
from primary.config import DEFAULT_CACHE_MAX_AGE, DEFAULT_STALE_WHILE_REVALIDATE

# Initialize with a factory function to ensure a new dict for each context
def get_default_context() -> Dict[str, Any]:
    return {"max_age": DEFAULT_CACHE_MAX_AGE, "stale_while_revalidate": DEFAULT_STALE_WHILE_REVALIDATE}


cache_context: ContextVar[Dict[str, Any]] = ContextVar("cache_context", default=get_default_context())


def add_custom_cache_time(max_age: int, stale_while_revalidate: int = 0) -> Callable:
    """
    Decorator that sets a custom browser cache time for the endpoint response.

    Args:
        max_age (int): The maximum age in seconds for the cache
        stale_while_revalidate (int): The stale-while-revalidate time in seconds

    Example:
        @add_custom_cache_time(300, 600) # 5 minutes max age, 10 minutes stale-while-revalidate
        async def my_endpoint():
            return {"data": "some_data"}
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Callable:
            context = cache_context.get()
            context["max_age"] = max_age
            context["stale_while_revalidate"] = stale_while_revalidate

            return await func(*args, **kwargs)

        return wrapper

    return decorator


def no_cache(func: Callable) -> Callable:
    """
    Decorator that explicitly disables browser caching for the endpoint response.

    Example:
        @no_cache
        async def my_endpoint():
            return {"data": "some_data"}
    """

    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Callable:
        context = cache_context.get()
        context["max_age"] = 0
        context["stale_while_revalidate"] = 0

        return await func(*args, **kwargs)

    return wrapper


class AddBrowserCacheMiddleware:
    """
    Adds cache-control to the response headers
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        # Set initial context and store token
        cache_context.set(get_default_context())

        async def send_with_cache_header(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                context = cache_context.get()
                cache_control_str = (
                    f"max-age={context['max_age']}, stale-while-revalidate={context['stale_while_revalidate']}, private"
                )
                headers.append("cache-control", cache_control_str)

            await send(message)

        await self.app(scope, receive, send_with_cache_header)
