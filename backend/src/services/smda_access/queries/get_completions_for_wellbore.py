from typing import List, Optional

from ..types import WellBoreCompletion
from ._get_request import get

projection = list(WellBoreCompletion.model_fields.keys())


async def get_completions_for_wellbore(
    access_token: str,
    wellbore_uuid: str,
) -> List[WellBoreCompletion]:
    """ """

    endpoint = "wellbore-completions"
    params = {
        "_projection": (" ,").join(projection),
        "wellbore_uuid": wellbore_uuid,
    }

    results = await get(access_token=access_token, endpoint=endpoint, params=params)
    completions = [WellBoreCompletion(**result) for result in results]
    return completions
