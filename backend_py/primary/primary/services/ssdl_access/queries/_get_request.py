from typing import List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config


async def get(access_token: str, endpoint: str, params: Optional[dict] = None) -> List[dict]:
    """
    Generic GET request to SSDL API.
    Uses `next` pagination to get all results.
    """
    urlstring = f"https://api.gateway.equinor.com/subsurfacedata/v3/api/v3.0/{endpoint}?"
    params = params if params else {}
    params.update({"_items": 10000})
    headers = {
        "Content-Type": "application/json",
        "authorization": f"Bearer {access_token}",
        "Ocp-Apim-Subscription-Key": config.ENTERPRISE_SUBSCRIPTION_KEY,
    }
    print(urlstring)
    timer = PerfTimer()

    async with httpx.AsyncClient() as client:
        response = await client.get(urlstring, params=params, headers=headers, timeout=60)
        results = []
        if response.status_code == 200:
            results = response.json()

        elif response.status_code == 404:
            print(f"{str(response.status_code) } {endpoint} either does not exists or can not be found")
        else:
            print(f"[WARNING:] Can not fetch data from endpont {endpoint}  ({ str(response.status_code)})")
        print(f"TIME SSDL fetch {endpoint} took {timer.lap_s():.2f} seconds")

    return results
