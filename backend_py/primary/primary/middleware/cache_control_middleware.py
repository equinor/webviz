from dataclasses import dataclass
from enum import Enum
from functools import wraps
from contextvars import ContextVar
from typing import Any, Callable

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Scope, Receive, Send, Message


class StaleTime(Enum):
    """Browser cache durations for endpoint responses in seconds.

    E.g. stale-while-revalidate

    NORMAL: 1 day
    LONG: 2 weeks
    """

    NORMAL = 3600 * 24  # 1 day
    LONG = 3600 * 24 * 14  # 2 weeks


class CacheTime(Enum):
    """Browser cache time durations for endpoint responses in seconds.

    NORMAL: 1 hour max-age
    LONG: 2 weeks max-age
    """

    NORMAL = 3600  # 1 hour
    LONG = 3600 * 24 * 14  # 2 weeks


@dataclass
class CacheSettings:
    """Cache settings for an endpoint response."""

    max_age_s: int
    stale_while_revalidate_s: int | None


# None means no cache override set (middleware will use no-store by default)
_cache_context: ContextVar[CacheSettings | None] = ContextVar("_cache_context", default=None)


def custom_cache_time(max_age_s: int, stale_while_revalidate_s: int | None) -> Callable:
    """
    Decorator that sets a custom browser cache time for the endpoint response.

    Args:
        max_age_s: Cache max-age in seconds (must be positive)
        stale_while_revalidate_s: Optional stale-while-revalidate in seconds (must be positive)

    Example:
        @custom_cache_time(max_age_s=3600 * 24 * 7)  # 1 week
        async def my_endpoint():
            return {"data": "some_data"}
    """

    if max_age_s <= 0:
        raise ValueError("Cache time must be a positive number of seconds")
    if stale_while_revalidate_s is not None and stale_while_revalidate_s <= 0:
        raise ValueError("stale_while_revalidate_s must be a positive number of seconds")

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper_async(*args: Any, **kwargs: Any) -> Any:
            _cache_context.set(CacheSettings(max_age_s=max_age_s, stale_while_revalidate_s=stale_while_revalidate_s))
            return await func(*args, **kwargs)

        return wrapper_async

    return decorator


def cache_time(duration: CacheTime, stale_while_revalidate: StaleTime | None = None) -> Callable:
    """
    Decorator that sets browser cache time for the endpoint response using a preset duration.

    Args:
        duration: CacheTime enum value
        stale_while_revalidate: Optional StaleTime enum value

    Examples:
        @cache_time(CacheTime.LONG)
        async def my_sumo_endpoint():
            return {"data": "some_data"}
    """
    stale_while_revalidate_s = stale_while_revalidate.value if stale_while_revalidate is not None else None

    return custom_cache_time(max_age_s=duration.value, stale_while_revalidate_s=stale_while_revalidate_s)


def set_cache_time(duration: CacheTime, stale_while_revalidate: StaleTime | None = None) -> None:
    """
    Utility function to opt in to caching from within an endpoint at runtime.

    Use this instead of the @cache_time decorator when caching should be conditional
    (e.g. only cache successful responses, not errors or in-progress).

    Args:
        duration: CacheTime enum value
        stale_while_revalidate: Optional StaleTime enum value

    Example:
        async def my_endpoint():
            result = await compute()
            if result.is_success:
                set_cache_time(CacheTime.NORMAL, StaleTime.LONG)
            return result
    """

    stale_while_revalidate_s = stale_while_revalidate.value if stale_while_revalidate is not None else None

    if stale_while_revalidate_s is not None and stale_while_revalidate_s <= 0:
        raise ValueError("stale_while_revalidate_s must be a positive number of seconds")

    _cache_context.set(CacheSettings(max_age_s=duration.value, stale_while_revalidate_s=stale_while_revalidate_s))


class CacheControlMiddleware:
    """
    Adds Cache-Control header to HTTP responses.

    Default: "no-store, private" (no store, more strict than no caching).
    Opt in: Endpoints opt in to caching via @cache_time(CacheTime.X) or @custom_cache_time
            decorator.

    Cache-control strings:

    - `no-store`: do not store response, not in browser memory, disk, proxy or temporary.
    - `no-cache`: can store response but must revalidate with server before using cached response.
    - `max-age`: browser can store response and use cached version for up to max-age seconds without
                 revalidating with server. After max-age expires, browser must revalidate with
                 server before using cached response.
    - `stale-while-revalidate`: when response is stale (after max-age expires), browser can still
                                use cached response while it revalidates with server in background,
                                for up to stale-while-revalidate seconds.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        # Reset context for each request
        _cache_context.set(None)

        async def send_with_cache_header_async(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)

                # Only set cache-control if not already present so we don't overwrite settings done in router
                if headers.get("cache-control") is None:
                    cache_control_str = self._build_cache_control_header()
                    headers.append("cache-control", cache_control_str)

            await send(message)

        await self.app(scope, receive, send_with_cache_header_async)

    def _build_cache_control_header(self) -> str:
        settings = _cache_context.get()
        if settings is not None and settings.max_age_s > 0:
            cache_control_str = f"max-age={settings.max_age_s}"
            if settings.stale_while_revalidate_s is not None and settings.stale_while_revalidate_s > 0:
                cache_control_str += f", stale-while-revalidate={settings.stale_while_revalidate_s}"
            cache_control_str += ", private"
            return cache_control_str

        # No store by default
        return "no-store, private"
