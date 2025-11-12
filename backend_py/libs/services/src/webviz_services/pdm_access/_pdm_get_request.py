import logging
from typing import List, Optional

from webviz_core_utils.perf_timer import PerfTimer

from webviz_services.services_config import get_services_config
from webviz_services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER
from webviz_services.service_exceptions import (
    Service,
    InvalidDataError,
    InvalidParameterError,
    AuthorizationError,
)

LOGGER = logging.getLogger(__name__)


def _make_headers(access_token: str) -> dict:
    services_config = get_services_config()

    return {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": services_config.enterprise_subscription_key,
    }


async def pdm_get_request_async(access_token: str, endpoint: str, params: Optional[dict] = None) -> List[dict]:
    """
    Generic GET request to PDM API.
    """
    urlstring = f"https://api.gateway.equinor.com/pdm-internal-api/v3/api/{endpoint}?"
    params = params if params else {}
    headers = _make_headers(access_token)
    timer = PerfTimer()

    response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.get(urlstring, params=params, headers=headers, timeout=60)
    results = []
    if response.status_code == 200:
        results = response.json()

    elif response.status_code == 401:
        LOGGER.debug(f"Unauthorized access to PDM endpoint {endpoint}: {response.text}")
        raise AuthorizationError("Unauthorized access to PDM", Service.PDM)
    elif response.status_code == 403:
        LOGGER.debug(f"Forbidden access to PDM endpoint {endpoint}: {response.text}")
        raise AuthorizationError("Forbidden access to PDM", Service.PDM)
    elif response.status_code == 404:
        LOGGER.debug(f"Endpoint {endpoint} not found: {response.text}")
        raise InvalidDataError(
            f"Endpoint {endpoint} either does not exists or can not be found",
            Service.PDM,
        )

    # Capture other errors
    else:
        LOGGER.debug(f"Error fetching from PDM endpoint {endpoint} (status {response.status_code}): {response.text}")
        raise InvalidParameterError(f"Can not fetch data from endpoint {endpoint}", Service.PDM)

    LOGGER.debug(f"TIME PDM fetch {endpoint} took {timer.lap_s():.2f} seconds")
    return results
