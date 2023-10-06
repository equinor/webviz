import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp


class AddProcessTimeToServerTimingMiddleware(BaseHTTPMiddleware):
    """
    Adds a metric entry to the Server-Timing header containing the time in ms
    that it took to process the request and generate a response
    """

    def __init__(self, app: ASGIApp, metric_name: str):
        super().__init__(app)
        self._metric_name = metric_name

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time_s = time.perf_counter()
        response = await call_next(request)
        elapsed_time_ms = int(1000 * (time.perf_counter() - start_time_s))
        response.headers.append("Server-Timing", f"{self._metric_name}; dur={elapsed_time_ms}")

        return response
