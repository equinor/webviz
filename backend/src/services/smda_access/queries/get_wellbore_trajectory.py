import pandas as pd

from src.services.utils.perf_timer import PerfTimer
from ..types import WellBoreTrajectory
from ._get_request import get


def get_wellbore_trajectory(access_token: str, wellbore_uuid: str) -> WellBoreTrajectory:
    endpoint = "wellbore-survey-samples"
    params = {
        "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
        "_sort": "md",
        "wellbore_uuid": wellbore_uuid,
    }

    timer = PerfTimer()
    result = get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SMDA fetch wellbore trajectories took {timer.lap_s():.2f} seconds")
    resultdf = pd.DataFrame.from_dict(result)
    print(f"TIME SMDA wellbore trajectories to dataframe{timer.lap_s():.2f} seconds")
    trajectory = WellBoreTrajectory(
        wellbore_uuid=resultdf["wellbore_uuid"].iloc[0],
        unique_wellbore_identifier=resultdf["unique_wellbore_identifier"].iloc[0],
        tvd_msl_arr=resultdf["tvd_msl"].tolist(),
        md_arr=resultdf["md"].tolist(),
        easting_arr=resultdf["easting"].tolist(),
        northing_arr=resultdf["northing"].tolist(),
    )

    return trajectory
