from typing import List

from . import schemas


def to_api_wellbore_picks_data(
    wellbore_picks: List[schemas.WellBorePick], strat_units: List[schemas.StratigraphicUnit]
) -> schemas.WellBorePicksAndStratUnits:
    return schemas.WellBorePicksAndStratUnits(
        picks=[schemas.WellBorePick(**wellborePick.__dict__) for wellborePick in wellbore_picks],
        strat_units=[schemas.StratigraphicUnit(**stratUnit.__dict__) for stratUnit in strat_units],
    )
