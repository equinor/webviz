from typing import List


from ..types import StratigraphicUnit


class StratigraphyAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    # type: ignore
    # pylint: disable=unused-argument
    def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        return [
            StratigraphicUnit(
                identifier="Therys Fm.",
                top="Therys Fm. Top",
                base="Therys Fm. Base",
                base_age=248,
                top_age=247,
                color_r=193,
                color_g=77,
                color_b=205,
                strat_unit_level=4,
                strat_unit_parent=None,
                lithology_type="unknown",
            ),
        ]
