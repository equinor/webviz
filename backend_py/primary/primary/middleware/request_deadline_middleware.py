import asyncio
import logging
import time
import contextlib

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from primary.utils.exception_handlers import make_error_response
from primary.middleware.slow_request_monitor import SlowRequestMonitor

LOGGER = logging.getLogger(__name__)


class RequestDeadlineMiddleware:
    """
    Middleware to cancel HTTP request processing when its deadline expires.

    As long as we have Nginx or some other reverse proxy in front of our application, the deadline set for this
    middleware should typically be slightly shorter than the actual timeout enforced by the reverse proxy.
    """

    def __init__(
        self,
        app: ASGIApp,
        deadline_s: float,
        exclude_paths: list[str] | None = None,
        slow_req_monitor: SlowRequestMonitor | None = None,
    ) -> None:
        self._app = app
        self._deadline_s = deadline_s
        self._exclude_paths = exclude_paths or []
        self._slow_req_monitor = slow_req_monitor

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return

        request_method = scope.get("method", "")
        request_path = scope.get("path", "")

        path_to_check = request_path
        root_path = scope.get("root_path", "")
        if root_path:
            path_to_check = path_to_check.replace(root_path, "")

        if path_to_check in self._exclude_paths:
            LOGGER.debug(f"RequestDeadlineMiddleware excluding request for path: {path_to_check=}")
            await self._app(scope, receive, send)
            return

        started_at = time.monotonic()

        # Wrap the send function so we can track if the response has started
        response_has_started = False

        async def send_and_track_response_start_async(message: Message) -> None:
            nonlocal response_has_started
            if message["type"] == "http.response.start":
                response_has_started = True
            await send(message)

        # Here timeout_cm is an asyncio.Timeout context manager that, once activated
        # with 'async with', will raise TimeoutError if the request takes too long.
        timeout_cm: asyncio.Timeout = asyncio.timeout(self._deadline_s)

        # Wrap the slow request monitor context manager if configured.
        monitor_cm: contextlib.AbstractAsyncContextManager[None] = contextlib.nullcontext()
        if self._slow_req_monitor:
            monitor_cm = self._slow_req_monitor.watch_request_async(request_method, request_path)

        try:
            async with monitor_cm:
                async with timeout_cm:
                    await self._app(scope, receive, send_and_track_response_start_async)

        except TimeoutError:
            # We must check if the deadline has actually expired to be sure that the TimeoutError
            # was triggered by the request exceeding its deadline and not some unrelated error.
            if not timeout_cm.expired():
                raise

            elapsed_s = time.monotonic() - started_at
            LOGGER.warning(
                f"Request deadline exceeded: {request_method} {request_path} (deadline={self._deadline_s:.1f}s, elapsed={elapsed_s:.1f}s, response_started={response_has_started})"
            )

            # Also, if the response has already started, we cannot send a new response, so just raise the exception.
            if response_has_started:
                raise

            # We're likely running outside the cache control middleware, so explicitly set caching to no-store.
            error_response = make_error_response(
                status_code=504,
                error_type="RequestDeadlineExceeded",
                message=f"The request took too long to complete (time limit: {self._deadline_s:.1f}s).",
                headers={"Cache-Control": "no-store"},
            )
            await error_response(scope, receive, send)
