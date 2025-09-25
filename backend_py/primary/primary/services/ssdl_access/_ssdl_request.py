import logging
from typing import List, Optional, Dict, Any

from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
from primary.services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER
from primary.services.service_exceptions import (
    Service,
    InvalidDataError,
    InvalidParameterError,
    AuthorizationError,
)

LOGGER = logging.getLogger(__name__)


async def ssdl_get_request_async(access_token: str, endpoint: str, params: Optional[dict] = None) -> List[dict]:
    """Convenience function for GET requests. Always returns a list of dictionaries."""
    result = await _ssdl_request_async(access_token, endpoint, method="GET", params=params)
    # GET requests always return List[dict], so we can safely cast
    return result if isinstance(result, list) else [result]


async def ssdl_post_request_async(
    access_token: str,
    endpoint: str,
    data: Optional[List[str]] = None,
    params: Optional[dict] = None,
) -> dict:
    """Convenience function for POST requests. Always returns a single dictionary."""
    result = await _ssdl_request_async(access_token, endpoint, method="POST", data=data, params=params)
    # POST requests always return dict, so we can safely cast
    return result if isinstance(result, dict) else result[0]


async def _ssdl_request_async(
    access_token: str,
    endpoint: str,
    method: str = "GET",
    data: Optional[List[str]] = None,
    params: Optional[dict] = None,
) -> List[dict] | dict:
    """
    Generic HTTP request to SSDL API.
    Supports both GET and POST methods.

    Args:
        access_token: Bearer token for authentication
        endpoint: SSDL API endpoint (without base URL)
        method: HTTP method ("GET" or "POST")
        data: Request body data for POST requests (list of strings)
        params: URL query parameters

    Returns:
        For GET requests: List[dict] - collection of items
        For POST requests: dict - single result object

    Note:
        GET requests always return collections (List[dict]).
        POST requests always return a single object (dict).

    Raises:
        AuthorizationError: For 401/403 responses
        InvalidDataError: For 404 responses
        InvalidParameterError: For 400 and other error responses
    """
    urlstring = f"https://api.gateway.equinor.com/subsurfacedata/v3/api/v3.0/{endpoint}?"
    params = params if params else {}
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": config.ENTERPRISE_SUBSCRIPTION_KEY,
    }
    timer = PerfTimer()

    # Make the HTTP request based on method
    if method.upper() == "POST":
        post_data = data if data else []
        response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.post(
            urlstring, json=post_data, params=params, headers=headers, timeout=60
        )
    elif method.upper() == "GET":
        response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.get(urlstring, params=params, headers=headers, timeout=60)
    else:
        raise InvalidParameterError(f"Unsupported HTTP method: {method}", Service.SSDL)

    # Handle response
    results = []
    if response.status_code in [200, 201]:
        results = response.json()
    elif response.status_code == 401:
        raise AuthorizationError("Unauthorized access to SSDL", Service.SSDL)
    elif response.status_code == 403:
        raise AuthorizationError("Forbidden access to SSDL", Service.SSDL)
    elif response.status_code == 404:
        raise InvalidDataError(f"No data found for endpoint {endpoint} with given parameters", Service.SSDL)
    elif response.status_code == 400:
        raise InvalidParameterError(f"Bad request to endpoint {endpoint}: {response.text}", Service.SSDL)
    else:
        # Capture other errors
        raise InvalidParameterError(
            f"Cannot {method.lower()} data from endpoint {endpoint}: {response.text}", Service.SSDL
        )

    LOGGER.debug(f"TIME SSDL {method.lower()} {endpoint} took {timer.lap_s():.2f} seconds")
    return results
