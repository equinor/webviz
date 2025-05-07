import logging
from typing import Annotated, List, Any

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.relperm_access import RelPermAccess
from primary.services.relperm_assembler.relperm_assembler import RelPermAssembler
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_names")
async def get_table_names(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> List[str]:
    access = await RelPermAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    return await access.get_relperm_table_names()


@router.get("/table_info")
async def get_table_info(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
) -> schemas.RelPermTableInfo:
    access = await RelPermAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    assembler = RelPermAssembler(access)
    relperm_table_info = await assembler.get_relperm_table_info(table_name)

    return converters.to_api_relperm_table_info(relperm_table_info)


@router.get("/realizations_curve_data")
async def get_realizations_curve_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    saturation_axis_name: Annotated[str, Query(description="Saturation axis name")],
    curve_names: Annotated[List[str], Query(description="Curve names")],
    satnums: Annotated[List[int], Query(description="Satnums")],
) -> schemas.RelPermRealizationDataForSaturation:

    access = await RelPermAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    assembler = RelPermAssembler(access)
    relperm_data = await assembler.get_relperm_realization_data(table_name, saturation_axis_name, curve_names, satnums)

    return converters.to_api_relperm_realization_data(relperm_data)


@router.get("/statistical_curve_data")
async def get_statistical_curve_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Table name")],
    saturation_axis_name: Annotated[str, Query(description="Saturation axis name")],
    curve_names: Annotated[List[str], Query(description="Curve names")],
    satnums: Annotated[List[int], Query(description="Satnums")],
) -> schemas.RelPermStatisticalDataForSaturation:

    access = await RelPermAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    assembler = RelPermAssembler(access)
    relperm_data = await assembler.get_relperm_statistics_data(table_name, saturation_axis_name, curve_names, satnums)

    return converters.to_api_relperm_statistical_data(relperm_data)
