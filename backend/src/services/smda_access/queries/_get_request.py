from typing import List

import requests
from dotenv import load_dotenv

from src.backend import config
from src.services.utils.perf_timer import PerfTimer

load_dotenv()


def get(access_token: str, endpoint: str, params: dict) -> List[dict]:
    """
    Generic GET request to SMDA API.
    Uses `next` pagination to get all results.
    https://smda.equinor.com/learn/develop/smda-rest-api/#_next
    """
    urlstring = f"https://api.gateway.equinor.com/smda/v2.0/smda-api/{endpoint}?"
    params = params if params else {}
    params.update({"_items": 10000})
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": config.SMDA_SUBSCRIPTION_KEY,
    }
    timer = PerfTimer()
    response = requests.get(urlstring, params=params, headers=headers, timeout=60)
    results = []
    if response.status_code == 200:
        results = response.json()["data"]["results"]
        next_request = response.json()["data"]["next"]
        while next_request is not None:
            params["_next"] = next_request
            response = requests.get(urlstring, params=params, headers=headers, timeout=60)
            result = response.json()["data"]["results"]
            if result:
                results.extend(response.json()["data"]["results"])
            next_request = response.json()["data"]["next"]
    elif response.status_code == 404:
        print(f"{str(response.status_code) } {endpoint} either does not exists or can not be found")
    else:
        print(
            f"[WARNING:] Can not fetch data from endpont {endpoint}  ({ str(response.status_code)})-{response.reason} "
        )
    print(f"TIME SMDA fetch {endpoint} took {timer.lap_s():.2f} seconds")
    return results
