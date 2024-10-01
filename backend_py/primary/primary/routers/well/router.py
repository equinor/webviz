import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from primary.services.smda_access.drogon import DrogonSmdaAccess
from primary.services.smda_access import SmdaAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from primary.services.ssdl_access.well_access import WellAccess as SsdlWellAccess

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/drilled_wellbore_headers/")
async def get_drilled_wellbore_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    # fmt:on
) -> List[schemas.WellboreHeader]:
    """Get wellbore headers for all wells in the field"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(),field_identifier=field_identifier)

    wellbore_headers = await well_access.get_wellbore_headers()

    return [converters.convert_wellbore_header_to_schema(wellbore_header) for wellbore_header in wellbore_headers]


@router.get("/well_trajectories/")
async def get_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    wellbore_uuids:List[str] =  Query(None, description="Optional subset of wellbore uuids")
    # fmt:on
) -> List[schemas.WellboreTrajectory]:
    """Get well trajectories for field"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(), field_identifier=field_identifier)

    wellbore_trajectories = await well_access.get_wellbore_trajectories(
        wellbore_uuids=wellbore_uuids
    )

    return [
        converters.convert_well_trajectory_to_schema(wellbore_trajectory)
        for wellbore_trajectory in wellbore_trajectories
    ]

@router.get("/wellbore_pick_identifiers/")
async def get_wellbore_pick_identifiers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    strat_column_identifier: str = Query(description="Stratigraphic column identifier")
    # fmt:on
) -> List[str]:
    """Get wellbore pick identifiers for field and stratigraphic column"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(), field_identifier=field_identifier)

    wellbore_picks = await well_access.get_wellbore_pick_identifiers_in_stratigraphic_column(
         strat_column_identifier=strat_column_identifier
    )
    return [wellbore_pick.name for wellbore_pick in wellbore_picks]

@router.get("/wellbore_picks_for_pick_identifier/")
async def get_wellbore_picks_for_pick_identifier(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    pick_identifier: str = Query(description="Pick identifier")
    # fmt:on
) -> List[schemas.WellborePick]:
    """Get wellbore picks for field and pick identifier"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(), field_identifier=field_identifier)

    wellbore_picks = await well_access.get_wellbore_picks_for_pick_identifier(
         pick_identifier=pick_identifier
    )
    return [converters.convert_wellbore_pick_to_schema(wellbore_pick) for wellbore_pick in wellbore_picks]

@router.get("/wellbore_completions/")
async def get_wellbore_completions(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreCompletion]:
    """Get well bore completions for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_completions = await well_access.get_completions_for_wellbore(wellbore_uuid=wellbore_uuid)
    return [
        converters.convert_wellbore_completion_to_schema(wellbore_completion)
        for wellbore_completion in wellbore_completions
    ]


@router.get("/wellbore_casings/")
async def get_wellbore_casings(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreCasing]:
    """Get well bore casings for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_casings = await well_access.get_casings_for_wellbore(wellbore_uuid=wellbore_uuid)

    return [converters.convert_wellbore_casing_to_schema(wellbore_casing) for wellbore_casing in wellbore_casings]


@router.get("/wellbore_perforations/")
async def get_wellbore_perforations(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellborePerforation]:
    """Get well bore casing for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_perforations = await well_access.get_perforations_for_wellbore(wellbore_uuid=wellbore_uuid)

    return [
        converters.convert_wellbore_perforation_to_schema(wellbore_perforation)
        for wellbore_perforation in wellbore_perforations
    ]


@router.get("/wellbore_log_curve_headers/")
async def get_wellbore_log_curve_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreLogCurveHeader]:
    """Get all log curve headers for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_log_curve_headers = await well_access.get_log_curve_headers_for_wellbore(wellbore_uuid=wellbore_uuid)

    return [
        converters.convert_wellbore_log_curve_header_to_schema(wellbore_log_curve_header)
        for wellbore_log_curve_header in wellbore_log_curve_headers
    ]


@router.get("/log_curve_data/")
async def get_log_curve_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    log_curve_name:str = Query(description="Log curve name")
    # fmt:on
) -> schemas.WellboreLogCurveData:
    """Get log curve data"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        raise NotImplementedError("DROGON log curve data not implemented")

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    log_curve = await well_access.get_log_curve_data(wellbore_uuid=wellbore_uuid, curve_name=log_curve_name)

    return converters.convert_wellbore_log_curve_data_to_schema(log_curve)
