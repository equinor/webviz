from typing import List


from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import WellboreHeader
from ._get_request import get


async def get_wellbore_headers(
    access_token: str,
    field_identifier: str,
) -> List[WellboreHeader]:
    endpoint = "wellbore-survey-headers"
    projection = [
        "wellbore_uuid",
        "unique_wellbore_identifier",
        "well_uuid",
        "unique_well_identifier",
        "well_easting",
        "well_northing",
        "depth_reference_point",
        "depth_reference_elevation",
    ]
    params = {
        "_projection": ",".join(projection),
        "_sort": "unique_wellbore_identifier",
        "field_identifier": field_identifier,
    }

    timer = PerfTimer()
    result = await get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SMDA fetch well headers took {timer.lap_s():.2f} seconds")
    return [WellboreHeader(**result) for result in result]
