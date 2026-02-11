from dataclasses import dataclass
from enum import Enum
from functools import wraps
from contextvars import ContextVar
from typing import Any, Callable

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Scope, Receive, Send, Message


class CacheTime(Enum):
    """Browser cache time durations for endpoint responses.

    DEFAULT: 1 hour max-age
    LONG: 2 weeks max-age
    """

    DEFAULT = 3600  # 1 hour
    LONG = 3600 * 24 * 14  # 2 weeks


@dataclass
class CacheSettings:
    """Cache settings for an endpoint response."""

    max_age_s: int
    stale_while_revalidate_s: int


# None means no cache override set (middleware will use no-store default)
_cache_context: ContextVar[CacheSettings | None] = ContextVar("_cache_context", default=None)


def custom_cache_time(max_age_s: int, stale_while_revalidate_s: int = 0) -> Callable:
    """
    Decorator that sets a custom browser cache time for the endpoint response.

    Args:
        max_age_s: Cache max-age in seconds (must be positive)
        stale_while_revalidate_s: stale-while-revalidate in seconds (must be non-negative)

    Example:
        @custom_cache_time(max_age_s=3600 * 24 * 7)  # 1 week
        async def my_endpoint():
            return {"data": "some_data"}
    """

    if max_age_s <= 0:
        raise ValueError("Cache time must be a positive number of seconds")
    if stale_while_revalidate_s < 0:
        raise ValueError("stale_while_revalidate_s must be a non-negative number of seconds")

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            _cache_context.set(CacheSettings(max_age_s=max_age_s, stale_while_revalidate_s=stale_while_revalidate_s))
            return await func(*args, **kwargs)

        return wrapper

    return decorator


# TODO: Consider if stale_while_revalidate_s should be replaced with a StaleTime enum similar to CacheTime for this
# non-custom decorator for simplicity?
def cache_time(duration: CacheTime, stale_while_revalidate_s: int = 0) -> Callable:
    """
    Decorator that sets browser cache time for the endpoint response using a preset duration.

    Args:
        duration: CacheTime enum value (DEFAULT or LONG)
        stale_while_revalidate_s: stale-while-revalidate in seconds (must be non-negative)

    Examples:
        @cache_time(CacheTime.LONG)
        async def my_sumo_endpoint():
            return {"data": "some_data"}
    """

    return custom_cache_time(max_age_s=duration.value, stale_while_revalidate_s=stale_while_revalidate_s)


class AddBrowserCacheMiddleware:
    """
    Adds Cache-Control header to HTTP responses.

    Default: "no-store, private" (no caching).
    Endpoints opt in to caching via @cache_time(CacheTime.X) or @custom_cache_time decorator.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        # Reset context for each request
        _cache_context.set(None)

        async def send_with_cache_header(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)

                # Only set cache-control if not already present so we don't overwrite settings done in router
                if headers.get("cache-control") is None:
                    cache_control_str = self._build_cache_control_header()
                    headers.append("cache-control", cache_control_str)

            await send(message)

        await self.app(scope, receive, send_with_cache_header)

    def _build_cache_control_header(self) -> str:
        settings = _cache_context.get()
        if settings is not None and settings.max_age_s > 0:
            cache_control_str = f"max-age={settings.max_age_s}"
            if settings.stale_while_revalidate_s >= 0:
                cache_control_str += f", stale-while-revalidate={settings.stale_while_revalidate_s}"
            cache_control_str += ", private"
            return cache_control_str

        # No caching
        return "no-store, private"
