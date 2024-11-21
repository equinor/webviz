from typing import List
import logging

import pandas as pd

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import WellboreTrajectory
from ._get_request import get

LOGGER = logging.getLogger(__name__)


async def _fetch_wellbore_trajectories(access_token: str, params: dict) -> List[WellboreTrajectory]:
    endpoint = "wellbore-survey-samples"
    base_params = {
        "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
        "_sort": "unique_wellbore_identifier,md",
    }
    base_params.update(params)

    timer = PerfTimer()

    result = await get(access_token=access_token, endpoint=endpoint, params=base_params)
    LOGGER.debug(f"TIME SMDA fetch wellbore trajectories took {timer.lap_s():.2f} seconds")

    resultdf = pd.DataFrame.from_dict(result)
    LOGGER.debug(f"TIME SMDA wellbore trajectories to dataframe{timer.lap_s():.2f} seconds")

    wellbore_trajectories: List[WellboreTrajectory] = []
    for wellbore_id, df in resultdf.groupby("unique_wellbore_identifier"):
        tvd_arr = df["tvd_msl"]
        md_arr = df["md"]
        easting_arr = df["easting"]
        northing_arr = df["northing"]

        if any(arr.isna().any() for arr in [tvd_arr, md_arr, easting_arr, northing_arr]):
            LOGGER.warning(f"Invalid wellbore trajectory for wellbore {wellbore_id}. Skipping.")
            continue

        wellbore_trajectories.append(
            WellboreTrajectory(
                wellbore_uuid=df["wellbore_uuid"].iloc[0],
                unique_wellbore_identifier=wellbore_id,
                tvd_msl_arr=tvd_arr,
                md_arr=md_arr,
                easting_arr=easting_arr,
                northing_arr=northing_arr,
            )
        )
    LOGGER.debug(f"TIME SMDA wellbore trajectories to list and validate {timer.lap_s():.2f} seconds")
    return wellbore_trajectories


async def get_wellbore_trajectories(access_token: str, wellbore_uuids: List[str]) -> List[WellboreTrajectory]:

    params = {
        "wellbore_uuid": ", ".join(wellbore_uuids),
    }
    return await _fetch_wellbore_trajectories(access_token, params)


async def get_field_wellbore_trajectories(
    access_token: str,
    field_identifier: str,
) -> List[WellboreTrajectory]:

    params = {
        "field_identifier": field_identifier,
    }

    return await _fetch_wellbore_trajectories(access_token, params)
