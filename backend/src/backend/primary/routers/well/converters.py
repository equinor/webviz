from typing import List

from . import schemas


def to_api_wellbore_picks_data(
    wellborePicks: List[schemas.WellBorePick], stratUnits: List[schemas.StratigraphicUnit]
) -> schemas.WellBorePicksAndStratUnits:
    return schemas.WellBorePicksAndStratUnits(picks=wellborePicks, strat_units=stratUnits)
