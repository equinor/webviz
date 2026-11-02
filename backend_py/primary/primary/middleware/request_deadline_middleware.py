import asyncio
import logging
import time

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from primary.utils.exception_handlers import make_error_response

LOGGER = logging.getLogger(__name__)


class RequestDeadlineMiddleware:
    """
    Middleware to cancel HTTP request processing when its deadline expires.

    As long as we have Nginx or some other reverse proxy in front of our application, the deadline set for this
    middleware should typically be slightly shorter than the actual timeout enforced by the reverse proxy.
    """

    def __init__(self, app: ASGIApp, deadline_s: float = 110) -> None:
        self.app = app
        self.deadline_s = deadline_s

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started_at = time.monotonic()

        # Wrap the send function so we can track if the response has started
        response_has_started = False

        async def send_and_track_response_start_async(message: Message) -> None:
            nonlocal response_has_started
            if message["type"] == "http.response.start":
                response_has_started = True
            await send(message)

        # Here timeout_context is an asyncio.Timeout context manager that, once activated
        # with 'async with', will raise TimeoutError if the request takes too long.
        timeout_context: asyncio.Timeout = asyncio.timeout(self.deadline_s)

        try:
            async with timeout_context:
                await self.app(scope, receive, send_and_track_response_start_async)

        except TimeoutError:
            # We must check if the deadline has actually expired to be sure that the TimeoutError
            # was triggered by the request exceeding its deadline and not some unrelated error.
            if not timeout_context.expired():
                raise

            elapsed_s = time.monotonic() - started_at
            request_method = scope.get("method", "")
            url_path = scope.get("path", "")
            LOGGER.warning(
                f"Request deadline exceeded: {request_method} {url_path} (deadline={self.deadline_s:.1f}s, elapsed={elapsed_s:.1f}s, response_started={response_has_started})"
            )

            # Also, if the response has already started, we cannot send a new response, so just raise the exception.
            if response_has_started:
                raise

            # We're likely running outside the cache control middleware, so explicitly set caching to no-store.
            error_response = make_error_response(
                status_code=504,
                error_type="RequestDeadlineExceeded",
                message=f"The request took too long to complete (time limit: {self.deadline_s:.1f}s).",
                headers={"Cache-Control": "no-store"},
            )
            await error_response(scope, receive, send)
