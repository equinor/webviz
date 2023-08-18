from typing import List

from src.services.utils.perf_timer import PerfTimer
from ..types import StratigraphicUnit
from ._get_request import get


def get_stratigraphic_units(access_token: str, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
    """Returns a list of all stratigraphic units in a stratigraphic column."""
    endpoint = "strat-units"
    params = {
        "strat_column_identifier": stratigraphic_column_identifier,
        "_sort": "top_age",
        "_projection": "top,base,identifier",
    }
    results = get(access_token=access_token, endpoint=endpoint, params=params)
    timer = PerfTimer()
    strat_units = [StratigraphicUnit(**result) for result in results]
    print(f"TIME SMDA validate stratigraphic units {timer.lap_s():.2f} seconds")
    return strat_units
