# type: ignore
import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from primary.services.smda_access.drogon import DrogonSmdaAccess
from primary.services.smda_access import SmdaAccess
from primary.services.smda_access import GeologyAccess as SmdaGeologyAccess

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from primary.services.ssdl_access.well_access import WellAccess as SsdlWellAccess

from . import schemas
from . import converters
from .utils import is_drogon_wellbore

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
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(), field_identifier=field_identifier)

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

    wellbore_trajectories = await well_access.get_wellbore_trajectories(wellbore_uuids=wellbore_uuids)

    return [
        converters.convert_well_trajectory_to_schema(wellbore_trajectory)
        for wellbore_trajectory in wellbore_trajectories
    ]


@router.get("/wellbore_stratigraphic_columns/")
async def get_wellbore_stratigraphic_columns(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
) -> list[schemas.StratigraphicColumn]:

    if is_drogon_wellbore(wellbore_uuid):
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    else:
        # TODO: Handle field
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(), field_identifier="FIELD")

    strat_columns = await well_access.get_stratigraphic_columns_for_wellbore(wellbore_uuid)

    return [converters.convert_stratigraphic_column_to_schema(col) for col in strat_columns if col.strat_column_type]


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

    wellbore_picks = await well_access.get_wellbore_picks_for_pick_identifier(pick_identifier=pick_identifier)
    return [converters.convert_wellbore_pick_to_schema(wellbore_pick) for wellbore_pick in wellbore_picks]


@router.get("/wellbore_picks_for_wellbore/")
async def get_wellbore_picks_for_wellbore(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    wellbore_uuid: str = Query(description="Wellbore uuid")
    # fmt:on
) -> List[schemas.WellborePick]:
    """Get wellbore picks for field and pick identifier"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = DrogonSmdaAccess()

    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token(), field_identifier=field_identifier)

    wellbore_picks = await well_access.get_wellbore_picks_for_wellbore(wellbore_uuid=wellbore_uuid)
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
    sources: List[schemas.WellLogCurveSourceEnum] = Query(
       description="Sources to fetch well-logs from. ",
       default=[schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG]
    )
    # fmt:on
) -> List[schemas.WellboreLogCurveHeader]:
    """
    Get all log curve headers for a single well bore.
    Logs are available from multiple sources, which can be specificed by the "sources" parameter.
    """

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []

    curve_headers = []

    if schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG in sources:
        curve_headers += await __get_headers_from_ssdl_well_log(authenticated_user, wellbore_uuid)

    if schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY in sources:
        curve_headers += await __get_headers_from_smda_geology(authenticated_user, wellbore_uuid)

    if schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY in sources:
        curve_headers += await __get_headers_from_smda_stratigraghpy(authenticated_user, wellbore_uuid)

    return curve_headers


async def __get_headers_from_ssdl_well_log(
    authenticated_user: AuthenticatedUser, wellbore_uuid: str
) -> list[schemas.WellboreLogCurveHeader]:
    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())
    headers = await well_access.get_log_curve_headers_for_wellbore(wellbore_uuid)

    # Missing log name implies garbage data, so we drop them
    valid_headers = filter(lambda header: header.log_name is not None, headers)

    return [converters.convert_wellbore_log_curve_header_to_schema(head) for head in valid_headers]


async def __get_headers_from_smda_geology(
    authenticated_user: AuthenticatedUser, wellbore_uuid: str
) -> list[schemas.WellboreLogCurveHeader]:
    # TODO fix field
    geol_access = SmdaGeologyAccess(authenticated_user.get_smda_access_token(), "FIELD")
    geo_headers = await geol_access.get_wellbore_geology_headers(wellbore_uuid)

    return [converters.convert_wellbore_geo_header_to_well_log_header(header) for header in geo_headers]


async def __get_headers_from_smda_stratigraghpy(authenticated_user: AuthenticatedUser, wellbore_uuid: str):
    # TODO fix field
    strat_access = SmdaAccess(authenticated_user.get_smda_access_token(), "FIELD")
    strat_columns = await strat_access.get_stratigraphic_columns_for_wellbore(wellbore_uuid)

    return [converters.convert_strat_column_to_well_log_header(col) for col in strat_columns if col.strat_column_type]


@router.get("/log_curve_data/")
async def get_log_curve_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    log_curve_name: str = Query(description="Log curve name or ID"),
    source: schemas.WellLogCurveSourceEnum = Query(
       description="Source to fetch well-logs from.",
       default=schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG
    )
    # fmt:on
) -> schemas.WellboreLogCurveData:
    """Get log curve data"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        raise NotImplementedError("DROGON log curve data not implemented")

    if source == schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG:
        # if people use the source-ID from recieved headers, this the log_curve_name param is in the shape of <log_name>::<curve_name>
        curve_name = log_curve_name
        if "::" in curve_name:
            curve_name = curve_name.split("::", 1)[1]

        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())
        log_curve = await well_access.get_log_curve_data(wellbore_uuid, curve_name)

        return converters.convert_wellbore_log_curve_data_to_schema(log_curve)

    if source == schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY:
        header_source, header_ident = log_curve_name.split("::", 1)

        # TODO: Remove "FIELD"
        geol_access = SmdaGeologyAccess(authenticated_user.get_smda_access_token(), "FIELD")

        geo_headers = await geol_access.get_wellbore_geology_headers(wellbore_uuid)
        geo_headers = [h for h in geo_headers if h.identifier == header_ident and h.source == header_source]

        if not geo_headers:
            raise ValueError("Could not find matching geology header")

        geo_header = geo_headers[0]

        geo_data = await geol_access.get_wellbore_geology_data(wellbore_uuid, geo_header.uuid)

        return converters.convert_geology_data_to_log_curve_schema(geo_header, geo_data)

    if source == schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY:
        # "Log curve name" in this context will be the column identifier
        strat_col = log_curve_name

        # TODO: Remove "Field"
        smda_access = SmdaAccess(authenticated_user.get_smda_access_token(), "FIELD")
        strat_units = await smda_access.get_stratigraphic_units(
            strat_column_identifier=strat_col,
            wellbore_uuid=wellbore_uuid,
            sort=["entry_md", "strat_unit_level"],
        )

        return converters.convert_strat_unit_data_to_log_curve_schema(strat_units)

    raise ValueError(f"Unknown source {source}")


@router.get("/wellbore_geology_headers")
async def get_wellbore_geology_headers(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
) -> List[schemas.WellboreGeoHeader]:
    """Gets headers for geological interproation data for a given wellbore"""
    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        raise NotImplementedError("DROGON log curve data not implemented")

    # TODO: Fix field from params
    geol_access = SmdaGeologyAccess(authenticated_user.get_smda_access_token(), "<<FIELD>>")
    geo_headers = await geol_access.get_wellbore_geology_headers(wellbore_uuid)

    return [converters.convert_wellbore_geo_header_to_schema(header) for header in geo_headers]


@router.get("/wellbore_geology_data")
async def get_wellbore_geology_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    geology_header_uuid: str = Query(description="Geology header uuid"),
) -> List[schemas.WellboreGeoData]:
    """Gets geological data entries for a given geology header"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        raise NotImplementedError("DROGON log curve data not implemented")

    # TODO: Fix field from params
    geol_access = SmdaGeologyAccess(authenticated_user.get_smda_access_token(), "<<FIELD>>")
    geol_data = await geol_access.get_wellbore_geology_data(wellbore_uuid, geology_header_uuid)

    return [converters.convert_wellbore_geo_data_to_schema(entry) for entry in geol_data]
