from typing import List

from .queries.get_stratigraphic_units import get_stratigraphic_units
from .types import StratigraphicUnit


class StratigraphyAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    async def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        """Get stratigraphic units for a given stratigraphic column"""
        return await get_stratigraphic_units(self._smda_token, stratigraphic_column_identifier)
