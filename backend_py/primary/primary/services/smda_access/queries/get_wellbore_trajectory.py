from typing import List

import pandas as pd

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import WellboreTrajectory
from ._get_request import get


async def get_wellbore_trajectories(access_token: str, wellbore_uuids: List[str]) -> List[WellboreTrajectory]:
    endpoint = "wellbore-survey-samples"
    params = {
        "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
        "_sort": "unique_wellbore_identifier,md",
        "wellbore_uuid": ", ".join(wellbore_uuids),
    }

    timer = PerfTimer()
    result = await get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SMDA fetch wellbore trajectories took {timer.lap_s():.2f} seconds")
    resultdf = pd.DataFrame.from_dict(result)
    print(f"TIME SMDA wellbore trajectories to dataframe{timer.lap_s():.2f} seconds")
    wellbore_trajectories: List[WellboreTrajectory] = []
    for wellbore, df in resultdf.groupby("unique_wellbore_identifier"):
        wellbore_trajectories.append(
            WellboreTrajectory(
                wellbore_uuid=df["wellbore_uuid"].iloc[0],
                unique_wellbore_identifier=wellbore,
                tvd_msl_arr=df["tvd_msl"].tolist(),
                md_arr=df["md"].tolist(),
                easting_arr=df["easting"].tolist(),
                northing_arr=df["northing"].tolist(),
            )
        )
    print(f"TIME SMDA wellbore trajectories to list and validate {timer.lap_s():.2f} seconds")
    return wellbore_trajectories
