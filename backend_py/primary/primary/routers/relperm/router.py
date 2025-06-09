import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.relperm_access import RelPermAccess
from primary.services.relperm_assembler.relperm_assembler import RelPermAssembler
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.utils.query_string_utils import decode_uint_list_str

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/relperm_table_names")
async def get_relperm_table_names(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> List[str]:
    access = RelPermAccess.from_iteration_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.get_relperm_table_names_async()


@router.get("/relperm_table_info")
async def get_relperm_table_info(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
) -> schemas.RelPermTableInfo:
    access = RelPermAccess.from_iteration_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    assembler = RelPermAssembler(access)
    relperm_table_info = await assembler.get_relperm_table_info_async(table_name)

    return converters.to_api_relperm_table_info(relperm_table_info)


@router.get("/relperm_realizations_curve_data")
async def get_relperm_realizations_curve_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    saturation_axis_name: Annotated[str, Query(description="Saturation axis name")],
    curve_names: Annotated[List[str], Query(description="Curve names")],
    satnum: Annotated[int, Query(description="Satnum")],
    realizations_encoded_as_uint_list_str: Annotated[
        str | None,
        Query(
            description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included."
        ),
    ] = None,
) -> List[schemas.RelPermRealizationData]:
    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    access = RelPermAccess.from_iteration_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    assembler = RelPermAssembler(access)
    relperm_data = await assembler.get_relperm_realization_data_async(
        table_name, saturation_axis_name, curve_names, satnum, realizations
    )

    return [converters.to_api_relperm_realization_data(data) for data in relperm_data]


# Same syntax as above including realizations , but for statistical data
@router.get("/relperm_statistical_curve_data")
async def get_relperm_statistical_curve_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    saturation_axis_name: Annotated[str, Query(description="Saturation axis name")],
    curve_names: Annotated[List[str], Query(description="Curve names")],
    satnum: Annotated[int, Query(description="Satnum")],
    realizations_encoded_as_uint_list_str: Annotated[
        str | None,
        Query(
            description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included."
        ),
    ] = None,
) -> schemas.RelPermStatisticalData | None:
    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    access = RelPermAccess.from_iteration_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    assembler = RelPermAssembler(access)
    stat_data = await assembler.get_relperm_statistical_data_async(
        table_name, saturation_axis_name, curve_names, satnum, realizations
    )

    if stat_data is None:
        return None
    return converters.to_api_relperm_statistical_data(stat_data)
