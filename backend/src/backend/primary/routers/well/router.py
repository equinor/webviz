import datetime
import logging
from typing import List, Optional, Sequence, Union

import pyarrow as pa
import pyarrow.compute as pc
from fastapi import APIRouter, Depends, HTTPException, Query

from src.services import mocked_drogon_access
from src.services.smda_access.well_access import WellAccess
from src.services.sumo_access.case_access import CaseAccess
from src.services.smda_access.stratigraphy_access import StratigraphyAccess
from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper

from src.services.smda_access.types import WellBoreHeader, WellBoreTrajectory

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/well_headers/")
def get_well_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    # Should be field identifier
    # fmt:on
) -> List[WellBoreHeader]:
    """Get well headers for all wells in the field"""

    sumo_case_access = CaseAccess(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = sumo_case_access.get_field_identifiers()[0]
    well_access: Union[WellAccess, mocked_drogon_access.WellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = mocked_drogon_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return well_access.get_well_headers(field_identifier=field_identifier)


@router.get("/field_well_trajectories/")
def get_field_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    # Should be field identifier
    # fmt:on
) -> List[WellBoreTrajectory]:
    """Get well trajectories for field"""
    sumo_case_access = CaseAccess(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = sumo_case_access.get_field_identifiers()[0]
    well_access: Union[WellAccess, mocked_drogon_access.WellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = mocked_drogon_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return well_access.get_field_wellbore_trajectories(field_identifier=field_identifier)


@router.get("/well_trajectory/")
def get_well_trajectory(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> WellBoreTrajectory:
    """Get well trajectory"""
    well_access: Union[WellAccess, mocked_drogon_access.WellAccess]
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        # Handle DROGON
        well_access = mocked_drogon_access.WellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = WellAccess(authenticated_user.get_smda_access_token())

    return well_access.get_wellbore_trajectory(wellbore_uuid=wellbore_uuid)
