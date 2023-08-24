from typing import List, Optional

from .types import WellBorePick, WellBoreTrajectory, WellBoreHeader

from .queries.get_well_headers import get_well_headers
from .queries.get_wellbore_picks_for_field import get_wellbore_picks_for_field
from .queries.get_field_wellbore_trajectories import get_field_wellbore_trajectories
from .queries.get_wellbore_trajectory import get_wellbore_trajectories
from .queries.get_wellbore_picks_for_wellbore import get_wellbore_picks_for_wellbore


class WellAccess:
    def __init__(self, access_token: str):
        self._smda_token = access_token

    def get_wellbore_picks(self, field_identifier: str, pick_identifier: str) -> List[WellBorePick]:
        wellbore_picks = get_wellbore_picks_for_field(
            access_token=self._smda_token,
            field_identifier=field_identifier,
            pick_identifier=pick_identifier,
        )
        return wellbore_picks

    def get_field_wellbore_trajectories(
        self, field_identifier: str, unique_wellbore_identifiers: Optional[List[str]] = None
    ) -> List[WellBoreTrajectory]:
        wellbore_trajectories = get_field_wellbore_trajectories(
            access_token=self._smda_token,
            field_identifier=field_identifier,
            unique_wellbore_identifiers=unique_wellbore_identifiers,
        )
        return wellbore_trajectories

    def get_wellbore_trajectories(self, wellbore_uuids: List[str]) -> List[WellBoreTrajectory]:
        wellbore_trajectories = get_wellbore_trajectories(access_token=self._smda_token, wellbore_uuids=wellbore_uuids)
        return wellbore_trajectories

    def get_well_headers(self, field_identifier: str) -> List[WellBoreHeader]:
        return get_well_headers(access_token=self._smda_token, field_identifier=field_identifier)

    def get_wellbore_picks_for_wellbore(self, wellbore_uuid: str, obs_no: int = None) -> List[WellBorePick]:
        wellbore_picks = get_wellbore_picks_for_wellbore(
            access_token=self._smda_token, wellbore_uuid=wellbore_uuid, obs_no=obs_no
        )
        return wellbore_picks
