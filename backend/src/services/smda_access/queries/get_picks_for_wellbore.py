from typing import List, Optional

from ..types import WellBorePick
from ._get_request import get


async def get_picks_for_wellbore(
    access_token: str,
    wellbore_uuid: str,
    pick_identifier: Optional[str] = None,
    interpreter: str = "STAT",
) -> List[WellBorePick]:
    """
    Returns wellbore picks for a given wellbore uuid. I.e. picks for each pick identifier (surface)
    with the matching wellbore uuid.

    If specific pick identifiers are not provided, all picks for the wellbore uuid are returned.
    """

    endpoint = "wellbore-picks"
    params = {
        "_sort": "unique_wellbore_identifier,md",
        "wellbore_uuid": wellbore_uuid,
        "interpreter": interpreter,
    }
    if pick_identifier:
        params["pick_identifier"] = pick_identifier

    results = await get(access_token=access_token, endpoint=endpoint, params=params)
    picks = [WellBorePick(**result) for result in results]
    return picks
