import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from src.services.smda_access import mocked_drogon_smda_access
from src.services.smda_access.well_access import WellAccess
from src.services.smda_access.stratigraphy_access import StratigraphyAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.services.sumo_access._helpers import SumoCase
from src.services.smda_access.types import WellBoreHeader, WellBoreTrajectory

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/well_headers/")
async def get_well_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    # Should be field identifier
    # fmt:on
) -> List[WellBoreHeader]:
    """Get well headers for all wells in the field"""

    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = (await case_inspector.get_field_identifiers())[0]
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_well_headers(field_identifier=field_identifier)


@router.get("/field_well_trajectories/")
async def get_field_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    unique_wellbore_identifiers:List[str] =  Query(None, description="Optional subset of well names")
    # fmt:on
) -> List[WellBoreTrajectory]:
    """Get well trajectories for field"""
    case_inspector = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = (await case_inspector.get_field_identifiers())[0]
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_field_wellbore_trajectories(
        field_identifier=field_identifier, unique_wellbore_identifiers=unique_wellbore_identifiers
    )


@router.get("/well_trajectories/")
async def get_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuids: List[str] = Query(description="Wellbore uuids"),
    # fmt:on
) -> List[WellBoreTrajectory]:
    """Get well trajectories"""
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]

    # Handle DROGON
    if all(x in ["drogon_horizontal", "drogon_vertical"] for x in wellbore_uuids):
        well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_wellbore_trajectories(wellbore_uuids=wellbore_uuids)


# @router.get("/wellbore_picks/")
# def get_wellbore_picks_for_wellbore(
#     # fmt:off
#     authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
#     case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
#     wellbore_uuid: str = Query(description="Wellbore uuid"),
#     # fmt:on
# ) -> schemas.WellBorePicksAndStratUnits:
#  """Get well bore picks for a single well bore"""
#     well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
#     case_inspector = CaseInspector(authenticated_user.get_sumo_access_token(), case_uuid)
#     strat_column_identifier = case_inspector.get_stratigraphic_column_identifier()

#     # Handle DROGON
#     if "drogon" in wellbore_uuid.lower():
#         well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
#         strat_access = mocked_drogon_smda_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
#     else:
#         well_access = WellAccess(authenticated_user.get_smda_access_token())
#         strat_access = StratigraphyAccess(authenticated_user.get_smda_access_token())
#     strat_units = strat_access.get_stratigraphic_units(strat_column_identifier)
#     wellbore_picks = well_access.get_wellbore_picks_for_wellbore(wellbore_uuid=wellbore_uuid)
#     return schemas.WellBorePicksAndStratUnits(picks=wellbore_picks, strat_units=strat_units)


@router.get("/wellbore_picks_and_stratigraphy_units/")
async def get_wellbore_picks_and_stratigraphy_units(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> schemas.WellBorePicksAndStratigraphyUnits:
    """Get well bore picks for a single well bore"""
    well_access: Union[WellAccess, mocked_drogon_smda_access.WellAccess]
    stratigraphy_access: Union[StratigraphyAccess, mocked_drogon_smda_access.StratigraphyAccess]

    sumo_case = await SumoCase.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid)
    stratigraphic_column_identifier = await sumo_case.get_stratigraphic_column_identifier()

    # Handle DROGON
    # if "drogon" in wellbore_uuid.lower():
    #     well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    #     stratigraphy_access = mocked_drogon_smda_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    # else:
    #     # NOTE: TEMPORARY EARLY RETURN
    #     return schemas.WellBorePicksAndStratigraphyUnits([], [])
    #     well_access = WellAccess(authenticated_user.get_smda_access_token())
    #     stratigraphy_access = StratigraphyAccess(authenticated_user.get_smda_access_token())

    # START TEMP CODE
    well_access = mocked_drogon_smda_access.WellAccess(authenticated_user.get_smda_access_token())
    stratigraphy_access = mocked_drogon_smda_access.StratigraphyAccess(authenticated_user.get_smda_access_token())
    # END TEMP CODE

    stratigraphy_units = await stratigraphy_access.get_stratigraphic_units(stratigraphic_column_identifier)
    wellbore_picks = await well_access.get_wellbore_picks(wellbore_uuid=wellbore_uuid.lower())

    return schemas.WellBorePicksAndStratigraphyUnits(picks=wellbore_picks, stratigraphy_units=stratigraphy_units)
