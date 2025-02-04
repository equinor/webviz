from typing import Optional
import httpx
import logging

LOGGER = logging.getLogger(__name__)


class HTTPXAsyncClientWrapper:
    """Global async client wrapper for HTTPX."""

    _instance: Optional["HTTPXAsyncClientWrapper"] = None
    _async_client: Optional[httpx.AsyncClient] = None

    def __new__(cls):
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
        """Instantiate the client. Call from the FastAPI startup hook."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient()
            LOGGER.info(f"httpx AsyncClient instantiated. Id {id(self._async_client)}")

    async def stop(self) -> None:
        """Gracefully shutdown. Call from FastAPI shutdown hook."""
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


# Create a singleton instance of the async client
httpx_async_client = HTTPXAsyncClientWrapper()
