import asyncio
from contextlib import suppress
from typing import Optional
import logging

import httpx

LOGGER = logging.getLogger(__name__)


class HTTPXAsyncClientWrapper:
    """Global async client wrapper for HTTPX."""

    _instance: Optional["HTTPXAsyncClientWrapper"] = None
    _async_client: Optional[httpx.AsyncClient] = None
    _pool_snapshot_task: Optional[asyncio.Task[None]] = None

    def __new__(cls) -> "HTTPXAsyncClientWrapper":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def client(self) -> httpx.AsyncClient:
        """Get the async client instance."""
        if self._async_client is None:
            raise RuntimeError("HTTPXAsyncClientWrapper not initialized. Call start() first.")
        return self._async_client

    def start(self) -> None:
        """
        Instantiate the client. Call from the FastAPI startup hook.
        This method should be called exactly once during the application startup.
        """
        if self._async_client is not None:
            raise RuntimeError("HTTPXAsyncClientWrapper already started.")

        # Try and increase the maximum number of concurrent connections and the max number of
        # keep-alive connections from their defualts of 100 and 20 respectively.
        limits = httpx.Limits(
            max_connections=300,
            max_keepalive_connections=100,
        )

        self._async_client = httpx.AsyncClient(limits=limits)
        LOGGER.info(
            f"HTTPXAsyncClientWrapper: instantiated shared AsyncClient, {limits=} (id={id(self._async_client)})"
        )

        self._pool_snapshot_task = asyncio.create_task(
            self._log_pool_snapshots_async(),
            name="httpx-pool-snapshots",
        )

    async def stop_async(self) -> None:
        """
        Gracefully shutdown. Call from FastAPI shutdown hook.
        This method should be called exactly once during the application shutdown.
        """
        LOGGER.info(f"HTTPXAsyncClientWrapper: shutting down shared AsyncClient (id={id(self._async_client)})")

        if self._pool_snapshot_task is not None:
            self._pool_snapshot_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._pool_snapshot_task
            self._pool_snapshot_task = None

        if self._async_client is not None:
            LOGGER.info(
                f"httpx async_client.is_closed: {self._async_client.is_closed}. " f"Id: {id(self._async_client)}"
            )
            await self._async_client.aclose()
            LOGGER.info(
                f"httpx async_client.is_closed: {self._async_client.is_closed}. " f"Id: {id(self._async_client)}"
            )
            self._async_client = None
            LOGGER.info("httpx AsyncClient closed")

    async def _log_pool_snapshots_async(self) -> None:
        try:
            while True:
                await asyncio.sleep(100)

                client = self._async_client
                if client is None or client.is_closed:
                    return

                transport = getattr(client, "_transport", None)
                pool = getattr(transport, "_pool", None)
                if pool is None:
                    LOGGER.warning("HTTPX pool snapshots unavailable")
                    return

                LOGGER.info(
                    "HTTPX pool snapshot: client_id=%s pool=%r",
                    id(client),
                    pool,
                )
        except asyncio.CancelledError:
            raise
        except Exception:
            LOGGER.exception("HTTPX pool snapshot monitoring stopped")


# Create a singleton instance of the async client
HTTPX_ASYNC_CLIENT_WRAPPER = HTTPXAsyncClientWrapper()
