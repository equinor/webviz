from contextlib import contextmanager
from typing import Generator
import httpx

from webviz_services.service_exceptions import Service
from webviz_services.service_exceptions import ServiceRequestError, ServiceTimeoutError, ServiceRateLimitError


@contextmanager
def translate_sumo_exceptions(operation: str | None = None) -> Generator[None, None, None]:
    """
    Translate exceptions raised by Sumo HTTP requests into service-specific exceptions.
    """
    context_str = f" Operation: {operation}" if operation else ""

    try:
        yield

    except httpx.PoolTimeout as exc:
        raise ServiceTimeoutError(f"Timed out while preparing request to Sumo.{context_str}", Service.SUMO) from exc

    except httpx.TimeoutException as exc:
        raise ServiceTimeoutError(f"Sumo request timed out.{context_str}", Service.SUMO) from exc

    except httpx.RequestError as exc:
        raise ServiceRequestError(f"Could not complete the request to Sumo.{context_str}", Service.SUMO) from exc

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code

        if status_code == 504:
            raise ServiceTimeoutError(f"Timed out waiting for Sumo response.{context_str}", Service.SUMO) from exc

        if status_code == 429:
            raise ServiceRateLimitError(f"Sumo rate limit has been exceeded.{context_str}", Service.SUMO) from exc

        raise ServiceRequestError(
            f"Sumo returned an unsuccessful response (HTTP {status_code}).{context_str}", Service.SUMO
        ) from exc
