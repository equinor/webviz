from typing import List, Optional

from src.services.utils.perf_timer import PerfTimer
from ..types import WellBorePick
from ._get_request import get


def get_wellbore_picks_for_wellbore(
    access_token: str,
    wellbore_uuid: str,
    interpreter: str = "STAT",
    obs_no: Optional[int] = None,
) -> List[WellBorePick]:
    """
    Returns wellbore picks for a given identifier(formation top/base)
    for all wells in a field
    """
    endpoint = "wellbore-picks"
    params = {
        "_sort": "unique_wellbore_identifier,md",
        "wellbore_uuid": wellbore_uuid,
        "interpreter": interpreter,
    }
    if obs_no:
        params["obs_no"] = str(obs_no)

    results = get(access_token=access_token, endpoint=endpoint, params=params)
    timer = PerfTimer()
    picks = [WellBorePick(**result) for result in results]
    print(f"TIME SMDA validate wellbore picks took {timer.lap_s():.2f} seconds")
    return picks
