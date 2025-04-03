import logging
from typing import List

from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
from primary.services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER
from primary.services.service_exceptions import ServiceRequestError, NoDataError, Service

LOGGER = logging.getLogger(__name__)


def _make_headers(access_token: str) -> dict:
    return {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": config.SMDA_SUBSCRIPTION_KEY,
    }


async def smda_get_request_async(access_token: str, endpoint: str, params: dict) -> List[dict]:
    """
    Generic GET request to SMDA API.
    Uses `next` pagination to get all results.
    https://smda.equinor.com/learn/develop/smda-rest-api/#_next
    """
    urlstring = f"https://api.gateway.equinor.com/smda/v2.0/smda-api/{endpoint}?"
    params = params if params else {}
    params.update({"_items": 10000})
    headers = _make_headers(access_token)

    timer = PerfTimer()
    single_lap_timer = PerfTimer()

    results: List[dict] = []
    page: int = 1
    while True:
        response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.get(urlstring, params=params, headers=headers, timeout=60)
        LOGGER.debug(f"TIME SMDA fetch '{endpoint}', page {page}, took {single_lap_timer.lap_s():.2f} seconds")
        page += 1
        if response.status_code == 200:
            result = response.json()["data"]["results"]
            if not result:
                raise NoDataError(f"No data found for endpoint: '{endpoint}'", Service.SMDA)

            results.extend(result)

            next_request = response.json()["data"]["next"]
            if next_request is None:
                break
            params["_next"] = next_request
        elif response.status_code == 404:
            LOGGER.error(f"{str(response.status_code) } {endpoint} either does not exists or can not be found")
            raise ServiceRequestError(
                f"[{str(response.status_code)}] '{endpoint}' either does not exists or can not be found",
                Service.SMDA,
            )
        else:
            raise ServiceRequestError(
                f"[{str(response.status_code)}] Cannot fetch data from endpoint: '{endpoint}'", Service.SMDA
            )

    LOGGER.debug(f"TIME SMDA fetch '{endpoint}' took {timer.lap_s():.2f} seconds")

    return results


async def smda_get_aggregation_request_async(access_token: str, endpoint: str, params: dict) -> dict:
    """
    Alternative getter; runs an aggregation (i.e. a count of occurences) request on the SMDA API, and returns the aggregated buckets for each aggregated value.
    https://smda.equinor.com/learn/develop/smda-rest-api/#_next
    """
    urlstring = f"https://api.gateway.equinor.com/smda/v2.0/smda-api/{endpoint}?"
    headers = _make_headers(access_token)
    timer = PerfTimer()

    params = params if params else {}
    params.update({"_items": 0})  # Since we only care about aggregations, no items are needed

    if "_aggregation" not in params.keys():
        raise ValueError("Aggregations parameter required.")

    response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.get(urlstring, params=params, headers=headers, timeout=60)

    aggregations: dict[str, list[dict]] = {}

    if response.status_code == 200:
        response_aggregations = response.json()["data"]["aggregations"]

        for aggregation_key in params["_aggregation"].split(","):
            # A count, is the only aggregation that exists
            buckets = response_aggregations[aggregation_key + "_count"]["buckets"]
            aggregations.update({aggregation_key: buckets})

    elif response.status_code == 404:
        raise ServiceRequestError(
            f"[{str(response.status_code)}] '{endpoint}' either does not exists or can not be found", Service.SMDA
        )

    else:
        raise ServiceRequestError(
            f"[{str(response.status_code)}] Cannot aggregate data from endpoint: '{endpoint}'", Service.SMDA
        )

    LOGGER.info(f"TIME SMDA aggregation '{endpoint}' took {timer.lap_s():.2f} seconds")

    return aggregations
