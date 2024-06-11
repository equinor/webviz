import logging
from typing import List, Optional

import httpx

from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
from primary.services.service_exceptions import (
    Service,
    InvalidDataError,
    InvalidParameterError,
    AuthorizationError,
)

LOGGER = logging.getLogger(__name__)


async def fetch_from_ssdl(access_token: str, endpoint: str, params: Optional[dict] = None) -> List[dict]:
    """
    Generic GET request to SSDL API.
    Uses `next` pagination to get all results.
    """
    urlstring = f"https://api.gateway.equinor.com/subsurfacedata/v3/api/v3.0/{endpoint}?"
    params = params if params else {}
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": config.ENTERPRISE_SUBSCRIPTION_KEY,
    }
    timer = PerfTimer()

    async with httpx.AsyncClient() as client:
        response = await client.get(urlstring, params=params, headers=headers, timeout=60)
        results = []
        if response.status_code == 200:
            results = response.json()

        elif response.status_code == 401:
            raise AuthorizationError("Unauthorized access to SSDL", Service.SSDL)
        elif response.status_code == 403:
            raise AuthorizationError("Forbidden access to SSDL", Service.SSDL)
        elif response.status_code == 404:
            raise InvalidDataError(f"Endpoint {endpoint} either does not exists or can not be found", Service.SSDL)

        # Capture other errors
        else:
            raise InvalidParameterError(f"Can not fetch data from endpoint {endpoint}", Service.SSDL)

        print(f"TIME SSDL fetch {endpoint} took {timer.lap_s():.2f} seconds")
        LOGGER.debug(f"TIME SSDL fetch {endpoint} took {timer.lap_s():.2f} seconds")
    return results
