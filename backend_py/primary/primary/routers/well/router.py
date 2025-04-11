import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from primary.services.smda_access.drogon import DrogonSmdaAccess
from primary.services.smda_access import SmdaAccess
from primary.services.smda_access import GeologyAccess as SmdaGeologyAccess
from primary.services.service_exceptions import NoDataError

from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.utils.drogon import is_drogon_identifier

from primary.services.ssdl_access.well_access import WellAccess as SsdlWellAccess
from primary.services.ssdl_access.drogon import DrogonWellAccess


from primary.middleware.add_browser_cache import add_custom_cache_time
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
    if is_drogon_identifier(field_identifier=field_identifier):
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token())

    wellbore_headers = await well_access.get_wellbore_headers_async(field_identifier)

    return [converters.convert_wellbore_header_to_schema(wellbore_header) for wellbore_header in wellbore_headers]


@router.get("/well_trajectories/")
@add_custom_cache_time(3600 * 24 * 7, 3600 * 24 * 7 * 10)  # 1 week cache, 10 week stale-while-revalidate
async def get_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    wellbore_uuids: List[str] | None = Query(None, description="Optional subset of wellbore uuids")
    # fmt:on
) -> List[schemas.WellboreTrajectory]:
    """Get well trajectories for field"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if is_drogon_identifier(field_identifier=field_identifier):
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token())

    wellbore_trajectories = await well_access.get_wellbore_trajectories_async(
        field_identifier=field_identifier,
        wellbore_uuids=wellbore_uuids,
    )

    return [
        converters.convert_well_trajectory_to_schema(wellbore_trajectory)
        for wellbore_trajectory in wellbore_trajectories
    ]


@router.get("/wellbore_pick_identifiers/")
async def get_wellbore_pick_identifiers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    strat_column_identifier: str = Query(description="Stratigraphic column identifier")
    # fmt:on
) -> List[str]:
    """Get wellbore pick identifiers for field and stratigraphic column"""
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if is_drogon_identifier(strat_column_identifier=strat_column_identifier):
        # Handle DROGON
        well_access = DrogonSmdaAccess()

    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token())

    wellbore_picks = await well_access.get_wellbore_pick_identifiers_in_stratigraphic_column_async(
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
    """Get picks for wellbores for field and pick identifier

    This implies picks for multiple wellbores for given field and pick identifier.
    E.g. picks for all wellbores in a given surface in a field.
    """
    well_access: Union[SmdaAccess, DrogonSmdaAccess]
    if is_drogon_identifier(field_identifier=field_identifier):
        # Handle DROGON
        well_access = DrogonSmdaAccess()

    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token())

    wellbore_picks = await well_access.get_wellbore_picks_for_pick_identifier_async(
        field_identifier=field_identifier,
        pick_identifier=pick_identifier,
    )
    return [converters.convert_wellbore_pick_to_schema(wellbore_pick) for wellbore_pick in wellbore_picks]


@router.get("/deprecated_wellbore_picks_for_wellbore/")
async def deprecated_get_wellbore_picks_for_wellbore(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid")
    # fmt:on
) -> List[schemas.WellborePick]:
    """Get wellbore picks for field and pick identifier

    NOTE: This endpoint is deprecated and is to be deleted when refactoring intersection module
    """
    well_access: Union[SmdaAccess, DrogonSmdaAccess]

    if is_drogon_identifier(wellbore_uuid=wellbore_uuid):
        # Handle DROGON
        well_access = DrogonSmdaAccess()

    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token())

    wellbore_picks = await well_access.get_wellbore_picks_for_wellbore_async(wellbore_uuid=wellbore_uuid)
    return [converters.convert_wellbore_pick_to_schema(wellbore_pick) for wellbore_pick in wellbore_picks]


@router.get("/wellbore_picks_in_strat_column")
async def get_wellbore_picks_in_strat_column(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    strat_column_identifier: str = Query(description="Filter by stratigraphic column"),
) -> list[schemas.WellborePick]:
    """
    Get wellbore picks for a single wellbore with stratigraphic column identifier
    """
    well_access: Union[SmdaAccess, DrogonSmdaAccess]

    if is_drogon_identifier(strat_column_identifier=strat_column_identifier):
        # Handle DROGON
        well_access = DrogonSmdaAccess()
    else:
        well_access = SmdaAccess(authenticated_user.get_smda_access_token())

    wellbore_picks = await well_access.get_wellbore_picks_in_stratigraphic_column_async(
        wellbore_uuid=wellbore_uuid, strat_column_identifier=strat_column_identifier
    )

    return [converters.convert_wellbore_pick_to_schema(wellbore_pick) for wellbore_pick in wellbore_picks]


@router.get("/wellbore_stratigraphic_columns/")
async def get_wellbore_stratigraphic_columns(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
) -> list[schemas.StratigraphicColumn]:

    smda_access: SmdaAccess | DrogonSmdaAccess
    if is_drogon_identifier(wellbore_uuid=wellbore_uuid):
        # Handle DROGON
        smda_access = DrogonSmdaAccess()
    else:
        smda_access = SmdaAccess(authenticated_user.get_smda_access_token())

    strat_columns = await smda_access.get_stratigraphic_columns_for_wellbore_async(wellbore_uuid)

    return [converters.to_api_stratigraphic_column(col) for col in strat_columns]


@router.get("/wellbore_completions/")
async def get_wellbore_completions(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreCompletion]:
    """Get well bore completions for a single well bore"""

    # Handle DROGON
    if is_drogon_identifier(wellbore_uuid=wellbore_uuid):
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_completions = await well_access.get_completions_for_wellbore_async(wellbore_uuid=wellbore_uuid)
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
    if is_drogon_identifier(wellbore_uuid=wellbore_uuid):
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_casings = await well_access.get_casings_for_wellbore_async(wellbore_uuid=wellbore_uuid)

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
    if is_drogon_identifier(wellbore_uuid=wellbore_uuid):
        return []

    well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_perforations = await well_access.get_perforations_for_wellbore_async(wellbore_uuid=wellbore_uuid)

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

    # pylint: disable=fixme
    # TODO: Future work -- Add wellbore survey sample endpoint. for last set of curves (for now) SSDL might be best

    curve_headers = []

    if schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG in sources:
        curve_headers += await _get_headers_from_ssdl_well_log_async(authenticated_user, wellbore_uuid)

    if schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY in sources:
        curve_headers += await _get_headers_from_smda_geology_async(authenticated_user, wellbore_uuid)

    if schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY in sources:
        curve_headers += await _get_headers_from_smda_stratigraghpy_async(authenticated_user, wellbore_uuid)

    return curve_headers


async def _get_headers_from_ssdl_well_log_async(
    authenticated_user: AuthenticatedUser, wellbore_uuid: str
) -> list[schemas.WellboreLogCurveHeader]:
    well_access_cls = DrogonWellAccess if is_drogon_identifier(wellbore_uuid=wellbore_uuid) else SsdlWellAccess
    well_access = well_access_cls(authenticated_user.get_ssdl_access_token())

    headers = await well_access.get_log_curve_headers_for_wellbore_async(wellbore_uuid)

    # Missing log name implies garbage data, so we drop them
    valid_headers = filter(lambda header: header.log_name is not None, headers)
    return [converters.convert_wellbore_log_curve_header_to_schema(head) for head in valid_headers]


async def _get_headers_from_smda_geology_async(
    authenticated_user: AuthenticatedUser, wellbore_uuid: str
) -> list[schemas.WellboreLogCurveHeader]:
    geol_access = SmdaGeologyAccess(authenticated_user.get_smda_access_token())

    try:
        geo_headers = await geol_access.get_wellbore_geology_headers_async(wellbore_uuid)
    except NoDataError:
        geo_headers = []

    return [converters.convert_wellbore_geo_header_to_well_log_header(header) for header in geo_headers]


async def _get_headers_from_smda_stratigraghpy_async(
    authenticated_user: AuthenticatedUser, wellbore_uuid: str
) -> list[schemas.WellboreLogCurveHeader]:
    strat_access = SmdaAccess(authenticated_user.get_smda_access_token())

    try:
        strat_columns = await strat_access.get_stratigraphic_columns_for_wellbore_async(wellbore_uuid)
    except NoDataError:
        strat_columns = []

    return [converters.convert_strat_column_to_well_log_header(col) for col in strat_columns if col.strat_column_type]


@router.get("/log_curve_data/")
async def get_log_curve_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    log_name: str = Query(description="Log identifier"),
    curve_name: str = Query(description="Curve identifier"),
    source: schemas.WellLogCurveSourceEnum = Query(
       description="Source to fetch well-logs from.",
       default=schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG
    )
    # fmt:on
) -> schemas.WellboreLogCurveData:
    """Get log curve data"""

    # Handle DROGON
    if is_drogon_identifier(wellbore_uuid=wellbore_uuid):
        well_access_drogon = DrogonWellAccess(authenticated_user.get_ssdl_access_token())
        curve_data = await well_access_drogon.get_log_curve_data_async(wellbore_uuid, curve_name)

        return converters.convert_wellbore_log_curve_data_to_schema(curve_data)

    if source == schemas.WellLogCurveSourceEnum.SSDL_WELL_LOG:
        # Note that log name is not used on SSDL; but afaik curve names are not unique across all logs...
        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())
        log_curve = await well_access.get_log_curve_data_async(wellbore_uuid, curve_name)

        return converters.convert_wellbore_log_curve_data_to_schema(log_curve)

    if source == schemas.WellLogCurveSourceEnum.SMDA_GEOLOGY:
        # Here, curve name is the identifier, and logname is the iterpreter

        geol_access = SmdaGeologyAccess(authenticated_user.get_smda_access_token())

        geo_headers = await geol_access.get_wellbore_geology_headers_async(wellbore_uuid)
        geo_headers = [h for h in geo_headers if h.identifier == curve_name and h.interpreter == log_name]

        if not geo_headers:
            raise ValueError("Could not find matching geology header")

        geo_header = geo_headers[0]

        geo_data = await geol_access.get_wellbore_geology_data_async(wellbore_uuid, geo_header.uuid)

        return converters.convert_geology_data_to_log_curve_schema(geo_header, geo_data)

    if source == schemas.WellLogCurveSourceEnum.SMDA_STRATIGRAPHY:
        # Here, the log name is the strat column. curve name is not used
        smda_access = SmdaAccess(authenticated_user.get_smda_access_token())

        wellbore_strat_units = await smda_access.get_stratigraphy_for_wellbore_and_column_async(wellbore_uuid, log_name)

        return converters.convert_strat_unit_data_to_log_curve_schema(wellbore_strat_units)

    raise ValueError(f"Unknown source {source}")
