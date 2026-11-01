import asyncio

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from primary.utils.exception_handlers import make_error_response


class RequestDeadlineMiddleware:
    """Cancel HTTP request processing when its deadline expires."""

    def __init__(self, app: ASGIApp, timeout_s: float = 110) -> None:
        self.app = app
        self.timeout_s = timeout_s

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        # Wrap the send function so we can track if the response has started
        async def send_and_track_response_start_async(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        # Here deadline is an asyncio.Timeout context manager that, once activated with 'async with'
        # below will raise TimeoutError if the request takes too long.
        deadline: asyncio.Timeout = asyncio.timeout(self.timeout_s)

        try:
            async with deadline:
                await self.app(scope, receive, send_and_track_response_start_async)
        except TimeoutError:
            # We must check if the deadline has actually expired to be sure that the TimeoutError
            # was triggered by the request exceeding its deadline and not some unrelated error.
            # Also, if the response has already started, we cannot send a new response, so just raise the exception.
            if not deadline.expired() or response_started:
                raise

            # We're likely running outside the cache control middleware, so explicitly set caching to no-store.
            error_response = make_error_response(
                status_code=504,
                error_type="RequestTimeoutError",
                message="Request deadline was exceeded",
                headers={"Cache-Control": "no-store"},
            )
            await error_response(scope, receive, send)
