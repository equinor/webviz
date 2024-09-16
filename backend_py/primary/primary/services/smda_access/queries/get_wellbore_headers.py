from typing import List
import logging

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import WellboreHeader
from ._get_request import get

LOGGER = logging.getLogger(__name__)

async def get_wellbore_headers(
    access_token: str,
    field_identifier: str,
) -> List[WellboreHeader]:

    timer = PerfTimer()

    survey_headers_endpoint = "wellbore-survey-headers"
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

    survey_header_results = await get(access_token=access_token, endpoint=survey_headers_endpoint, params=params)
    LOGGER.debug(f"TIME SMDA fetch well headers took {timer.lap_s():.2f} seconds")

    wellheaders_endpoint = "wellheaders"
    projection = [
        "unique_wellbore_identifier",
        "wellbore_purpose",
        "wellbore_status"
    ]
    params = {
        "_projection": ",".join(projection),
        "_sort": "unique_wellbore_identifier",
        "field_identifier": field_identifier,
    }

    wellbore_headers_results = await get(access_token=access_token, endpoint=wellheaders_endpoint, params=params)

    for survey_header in survey_header_results:
        for wellbore_header in wellbore_headers_results:
            if survey_header['unique_wellbore_identifier'] == wellbore_header['unique_wellbore_identifier']:
                survey_header['wellbore_purpose'] = wellbore_header['wellbore_purpose']
                survey_header['wellbore_status'] = wellbore_header['wellbore_status']
                break
        
    LOGGER.debug(f"TIME SMDA fetch well headers took {timer.lap_s():.2f} seconds")
    return [WellboreHeader(**result) for result in survey_header_results]
