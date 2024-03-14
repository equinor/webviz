from typing import List
import pytest

from primary.services.smda_access.stratigraphy_utils import (
    sort_stratigraphic_names_by_hierarchy,
    sort_stratigraphic_units_by_hierarchy,
)
from primary.services.smda_access.types import StratigraphicUnit, StratigraphicSurface, StratigraphicFeature
from primary.services.smda_access.mocked_drogon_smda_access._mocked_stratigraphy_access import DROGON_STRAT_UNITS


@pytest.mark.parametrize(
    "strat_units, expected_output",
    [
        (
            DROGON_STRAT_UNITS,
            [DROGON_STRAT_UNITS[3], DROGON_STRAT_UNITS[0], DROGON_STRAT_UNITS[1], DROGON_STRAT_UNITS[2]],
        ),
    ],
)
def test_sort_stratigraphic_units_by_hierarchy(
    strat_units: List[StratigraphicUnit], expected_output: List[StratigraphicUnit]
) -> None:
    sorted_units = sort_stratigraphic_units_by_hierarchy(strat_units)
    assert sorted_units == expected_output


@pytest.mark.parametrize(
    "strat_units, expected_output",
    [
        (
            DROGON_STRAT_UNITS,
            [
                StratigraphicSurface(name="VOLANTIS GP. Top", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="VOLANTIS GP.", feature=StratigraphicFeature.ZONE),
                StratigraphicSurface(name="Valysar Fm. Top", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="Valysar Fm.", feature=StratigraphicFeature.ZONE),
                StratigraphicSurface(name="Valysar Fm. Base", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="Therys Fm. Top", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="Therys Fm.", feature=StratigraphicFeature.ZONE),
                StratigraphicSurface(name="Therys Fm. Base", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="Volon Fm. Top", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="Volon Fm.", feature=StratigraphicFeature.ZONE),
                StratigraphicSurface(name="Volon Fm. Base", feature=StratigraphicFeature.HORIZON),
                StratigraphicSurface(name="VOLANTIS GP. Base", feature=StratigraphicFeature.HORIZON),
            ],
        ),
    ],
)
def test_sort_stratigraphic_names_by_hierarchy(
    strat_units: List[StratigraphicUnit], expected_output: List[StratigraphicSurface]
) -> None:
    sorted_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)
    sorted_surface_names = [surf.name for surf in sorted_surfaces]
    expected_surface_names = [surf.name for surf in expected_output]
    assert sorted_surface_names == expected_surface_names
    sorted_features = [surf.feature for surf in sorted_surfaces]
    expected_features = [surf.feature for surf in expected_output]
    assert sorted_features == expected_features
