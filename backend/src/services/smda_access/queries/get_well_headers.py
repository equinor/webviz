from typing import List


from src.services.utils.perf_timer import PerfTimer
from ..types import WellBoreHeader
from ._get_request import get


def get_well_headers(
    access_token: str,
    field_identifier: str,
) -> List[WellBoreHeader]:
    endpoint = "wellheaders"
    projection = [
        "wellbore_uuid",
        "unique_wellbore_identifier",
        "easting",
        "northing",
        "total_depth_driller_tvd",
        "total_depth_driller_md",
        "drill_start_date",
        # "drill_end_date",
        "wellbore_purpose",
        "parent_wellbore",
    ]
    params = {
        "_projection": ",".join(projection),
        "_sort": "unique_wellbore_identifier",
        "field_identifier": field_identifier,
    }

    timer = PerfTimer()
    result = get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SMDA fetch well headers took {timer.lap_s():.2f} seconds")
    return [WellBoreHeader(**result) for result in result]
