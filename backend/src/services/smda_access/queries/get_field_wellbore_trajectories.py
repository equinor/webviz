from typing import List, Optional

import pandas as pd

from src.services.utils.perf_timer import PerfTimer
from ..types import WellBoreTrajectory
from ._get_request import get


def get_field_wellbore_trajectories(
    access_token: str,
    field_identifier: str,
    unique_wellbore_identifiers: Optional[List[str]] = None,
) -> List[WellBoreTrajectory]:
    endpoint = "wellbore-survey-samples"
    params = {
        "_projection": "wellbore_uuid, unique_wellbore_identifier,easting,northing,tvd_msl,md",
        "_sort": "unique_wellbore_identifier,md",
        "field_identifier": field_identifier,
    }
    if unique_wellbore_identifiers:
        params["unique_wellbore_identifiers"] = ", ".join(unique_wellbore_identifiers)
    timer = PerfTimer()
    result = get(access_token=access_token, endpoint=endpoint, params=params)
    print(f"TIME SMDA fetch wellbore trajectories took {timer.lap_s():.2f} seconds")
    resultdf = pd.DataFrame.from_dict(result)
    print(f"TIME SMDA wellbore trajectories to dataframe{timer.lap_s():.2f} seconds")
    wellbore_trajectories: List[WellBoreTrajectory] = []
    for wellbore, df in resultdf.groupby("unique_wellbore_identifier"):
        wellbore_trajectories.append(
            WellBoreTrajectory(
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
