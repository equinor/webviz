from typing import List, Optional

from ..types import WellborePick, WellboreTrajectory, WellboreHeader, StratigraphicUnit, StratigraphicSurface
from ..stratigraphy_utils import sort_stratigraphic_names_by_hierarchy

from ._drogon_strat_units import get_drogon_strat_units
from ._drogon_well_data import get_drogon_well_trajectories, get_drogon_well_headers, get_drogon_well_picks


class SmdaAccess:
    """Drogon SMDA access class containing methods to get mocked Drogon data
    disable-unused-argument needed to keep the same method signature as the SMDA access class"""

    def __init__(self) -> None:
        pass

    # pylint: disable=unused-argument
    async def get_stratigraphic_units(self, stratigraphic_column_identifier: str) -> List[StratigraphicUnit]:
        return get_drogon_strat_units()

    async def get_wellbore_headers(self) -> List[WellboreHeader]:
        """Get Drogon wellbore headers"""
        return get_drogon_well_headers()

    async def get_wellbore_trajectories(self, wellbore_uuids: Optional[List[str]] = None) -> List[WellboreTrajectory]:
        """Get all Drogon trajectories"""
        all_well_trajs = get_drogon_well_trajectories()
        if wellbore_uuids:
            return [traj for traj in all_well_trajs if traj.wellbore_uuid in wellbore_uuids]
        return all_well_trajs

    # pylint: disable=unused-argument
    async def get_wellbore_picks_for_wellbore(
        self, wellbore_uuid: str, obs_no: Optional[int] = None
    ) -> List[WellborePick]:
        """Get Drogon picks for a wellbore"""
        well_picks = [pick for pick in get_drogon_well_picks() if pick.wellbore_uuid == wellbore_uuid]
        return well_picks

    # pylint: disable=unused-argument
    async def get_wellbore_picks_for_pick_identifier(
        self,
        pick_identifier: str,
        interpreter: str = "STAT",
        obs_no: Optional[int] = None,
    ) -> List[WellborePick]:
        """Get Drogon picks for a pick identifier"""
        return [pick for pick in get_drogon_well_picks() if pick.pick_identifier == pick_identifier]

    async def get_wellbore_pick_identifiers_in_stratigraphic_column(
        self, strat_column_identifier: str
    ) -> List[StratigraphicSurface]:
        """Get Drogon pick identifiers for a stratigraphic column"""
        strat_units = await self.get_stratigraphic_units(strat_column_identifier)
        sorted_stratigraphic_surfaces = sort_stratigraphic_names_by_hierarchy(strat_units)
        return sorted_stratigraphic_surfaces
