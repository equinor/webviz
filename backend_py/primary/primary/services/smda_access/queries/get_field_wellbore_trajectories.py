from typing import List, Optional
import logging

import pandas as pd

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import WellboreTrajectory
from ._get_request import get

LOGGER = logging.getLogger(__name__)


async def get_field_wellbore_trajectories(
    access_token: str,
    field_identifier: str,
    unique_wellbore_identifiers: Optional[List[str]] = None,
) -> List[WellboreTrajectory]:
    endpoint = "wellbore-survey-samples"
    params = {
        "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
        "_sort": "unique_wellbore_identifier,md",
        "field_identifier": field_identifier,
    }
    if unique_wellbore_identifiers:
        params["unique_wellbore_identifiers"] = ", ".join(unique_wellbore_identifiers)
    timer = PerfTimer()
    result = await get(access_token=access_token, endpoint=endpoint, params=params)
    LOGGER.debug(f"TIME SMDA fetch wellbore trajectories took {timer.lap_s():.2f} seconds")
    resultdf = pd.DataFrame.from_dict(result)
    LOGGER.debug(f"TIME SMDA wellbore trajectories to dataframe{timer.lap_s():.2f} seconds")
    wellbore_trajectories: List[WellboreTrajectory] = []
    for wellbore, df in resultdf.groupby("unique_wellbore_identifier"):
        tvd_arr = df["tvd_msl"]
        md_arr = df["md"]
        easting_arr = df["easting"]
        northing_arr = df["northing"]

        if any(arr.isna().any() for arr in [tvd_arr, md_arr, easting_arr, northing_arr]):
            LOGGER.warning(f"Invalid wellbore trajectory for wellbore {wellbore}. Skipping.")
            continue

        wellbore_trajectories.append(
            WellboreTrajectory(
                wellbore_uuid=df["wellbore_uuid"].iloc[0],
                unique_wellbore_identifier=wellbore,
                tvd_msl_arr=tvd_arr,
                md_arr=md_arr,
                easting_arr=easting_arr,
                northing_arr=northing_arr,
            )
        )
    LOGGER.debug(f"TIME SMDA wellbore trajectories to list and validate {timer.lap_s():.2f} seconds")
    return wellbore_trajectories
