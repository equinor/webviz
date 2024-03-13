from typing import List


from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import WellBoreHeader
from ._get_request import get


async def get_well_headers(
    access_token: str,
    field_identifier: str,
) -> List[WellBoreHeader]:
    endpoint = "wellbore-survey-headers"
    projection = [
        "wellbore_uuid",
        "unique_wellbore_identifier",
        "well_uuid",
        "unique_well_identifier",
        "well_easting",
        "well_northing",
    ]
    params = {
        "_projection": ",".join(projection),
        "_sort": "unique_wellbore_identifier",
        "field_identifier": field_identifier,
    }

    timer = PerfTimer()
    result = await get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SMDA fetch well headers took {timer.lap_s():.2f} seconds")
    return [WellBoreHeader(**result) for result in result]
