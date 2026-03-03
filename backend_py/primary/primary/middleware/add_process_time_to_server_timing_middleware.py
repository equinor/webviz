import time

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class AddProcessTimeToServerTimingMiddleware:
    """
    Adds a metric entry to the Server-Timing header containing the time in ms
    that it took to process the request and generate a response
    """

    def __init__(self, app: ASGIApp, metric_name: str):
        self._app = app
        self._metric_name = metric_name

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self._app(scope, receive, send)

        start_time_s = time.perf_counter()

        async def send_with_server_timing_header_async(message: Message) -> None:
            if message["type"] == "http.response.start":
                elapsed_time_ms = int(1000 * (time.perf_counter() - start_time_s))
                headers = MutableHeaders(scope=message)
                headers.append("Server-Timing", f"{self._metric_name}; dur={elapsed_time_ms}")

            await send(message)

        await self._app(scope, receive, send_with_server_timing_header_async)
