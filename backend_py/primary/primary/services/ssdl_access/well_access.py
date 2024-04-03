from typing import List, Optional


from .queries._get_completions import get_completions_for_wellbore


class WellAccess:
    def __init__(self, access_token: str):
        self._ssdl_token = access_token

    async def get_completions_for_wellbore(self, wellbore_uuid: str) -> List[str]:
        wellbore_completions = await get_completions_for_wellbore(
            access_token=self._ssdl_token,
            wellbore_uuid=wellbore_uuid,
        )
        print(wellbore_completions)
        return wellbore_completions
