import asyncio
import logging
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager, suppress

import httpx
import httpcore

LOGGER = logging.getLogger(__name__)


class SlowRequestMonitor:
    """
    Will start doing logging of the HTTPX connection pool state when one or more requests requests
    being watched exceed the configured duration threshold. Stops logging when no slow requests remain.
    """

    def __init__(
        self,
        client_provider: Callable[[], httpx.AsyncClient],
        slow_request_threshold_s: float = 30,
        logging_interval_s: float = 10,
    ) -> None:
        if slow_request_threshold_s <= 0:
            raise ValueError("slow_request_threshold_s must be positive")
        if logging_interval_s <= 0:
            raise ValueError("logging_interval_s must be positive")

        self._client_provider = client_provider
        self._slow_request_threshold_s = slow_request_threshold_s
        self._logging_interval_s = logging_interval_s
        self._slow_request_count = 0
        self._logging_task: asyncio.Task[None] | None = None

    @asynccontextmanager
    async def watch_request_async(self, request_method: str, request_path: str) -> AsyncGenerator[None]:
        """
        Monitor the request, and if it runs beyond the configured slow threshold, start logging
        the state of the connection pool for diagnostics
        """

        async def register_after_threshold_async() -> bool:
            await asyncio.sleep(self._slow_request_threshold_s)
            self._register_slow_request(request_method, request_path)
            return True

        registration_task = asyncio.create_task(register_after_threshold_async())
        try:
            yield
        finally:
            registration_task.cancel()
            try:
                was_registered = await registration_task
            except asyncio.CancelledError:
                was_registered = False
            except Exception:  # pylint: disable=broad-exception-caught
                LOGGER.exception("Failed to start HTTPX pool state logging for slow request")
                was_registered = False

            if was_registered:
                await self._unregister_slow_request_async()

    def _register_slow_request(self, request_method: str, request_path: str) -> None:
        self._slow_request_count += 1
        if self._logging_task and not self._logging_task.done():
            return

        LOGGER.info(
            f"Starting HTTPX pool state logging: threshold exceeded by: {request_method} {request_path}, slow_request_count={self._slow_request_count}, logging_interval={self._logging_interval_s}s"
        )
        self._logging_task = asyncio.create_task(self._log_pool_state_async(), name="httpx-pool-logging")

    async def _unregister_slow_request_async(self) -> None:
        self._slow_request_count = max(0, self._slow_request_count - 1)
        if self._slow_request_count > 0:
            return

        LOGGER.info("Stopping HTTPX pool state logging: no slow requests remain")
        logging_task = self._logging_task
        self._logging_task = None
        if logging_task:
            logging_task.cancel()
            with suppress(asyncio.CancelledError):
                await logging_task

    async def _log_pool_state_async(self) -> None:
        try:
            while self._slow_request_count > 0:
                client: httpx.AsyncClient = self._client_provider()
                if client.is_closed:
                    LOGGER.warning("HTTPX pool state unavailable: shared client is closed")
                    return

                transport: httpx.AsyncHTTPTransport | None = getattr(client, "_transport", None)
                pool: httpcore.AsyncConnectionPool | None = getattr(transport, "_pool", None)
                if pool:
                    LOGGER.info(f"HTTPX pool state: slow_request_count={self._slow_request_count} pool={repr(pool)}")

                await asyncio.sleep(self._logging_interval_s)

        except Exception:  # pylint: disable=broad-exception-caught
            LOGGER.exception("HTTPX pool state logging stopped")
