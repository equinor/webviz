from typing import List

from ..types import StratigraphicUnit


def get_drogon_strat_units() -> List[StratigraphicUnit]:
    return [
        StratigraphicUnit(
            identifier="Valysar Fm.",
            top="Valysar Fm. Top",
            base="Valysar Fm. Base",
            color_r=255,
            color_g=165,
            color_b=0,
            strat_unit_level=2,
            strat_unit_type="formation",
            strat_unit_parent="VOLANTIS GP.",
            top_age=1,
            base_age=2,
            lithology_type="unknown",
        ),
        StratigraphicUnit(
            identifier="Therys Fm.",
            top="Therys Fm. Top",
            base="Therys Fm. Base",
            color_r=255,
            color_g=255,
            color_b=0,
            strat_unit_level=2,
            strat_unit_type="formation",
            strat_unit_parent="VOLANTIS GP.",
            top_age=2,
            base_age=3,
            lithology_type="unknown",
        ),
        StratigraphicUnit(
            identifier="Volon Fm.",
            top="Volon Fm. Top",
            base="Volon Fm. Base",
            color_r=143,
            color_g=188,
            color_b=143,
            strat_unit_level=2,
            strat_unit_type="formation",
            strat_unit_parent="VOLANTIS GP.",
            top_age=3,
            base_age=4,
            lithology_type="unknown",
        ),
        StratigraphicUnit(
            identifier="VOLANTIS GP.",
            top="VOLANTIS GP. Top",
            base="VOLANTIS GP. Base",
            color_r=255,
            color_g=165,
            color_b=0,
            strat_unit_level=1,
            strat_unit_type="group",
            strat_unit_parent=None,
            top_age=4,
            base_age=5,
            lithology_type="unknown",
        ),
    ]
