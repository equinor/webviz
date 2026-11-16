import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from webviz_services.sumo_access.relperm_access import RelpermAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import CacheTime, cache_time
from primary.utils.query_string_utils import decode_uint_list_str

from . import converters, schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_names")
@cache_time(CacheTime.LONG)
async def get_relperm_table_names(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[str]:
    access = RelpermAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    return await access.get_table_names_async()


@router.get("/table_definition")
@cache_time(CacheTime.LONG)
async def get_relperm_table_definition(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Relperm table name")],
) -> schemas.RelpermTableDefinition:
    access = RelpermAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    table_definition = await access.get_table_definition_async(table_name)
    return converters.to_api_table_definition(table_definition)


@router.get("/realization_data")
@cache_time(CacheTime.LONG)
async def get_relperm_realization_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    table_name: Annotated[str, Query(description="Relperm table name")],
    saturation_axis_name: Annotated[str, Query(description="Saturation axis name")],
    curve_names: Annotated[list[str], Query(description="Curve names")],
    satnums: Annotated[list[int], Query(description="SATNUM values")],
    realizations_encoded_as_uint_list_str: Annotated[
        str | None,
        Query(
            description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included."
        ),
    ] = None,
) -> schemas.RelpermRealizationDataResponse:
    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    access = RelpermAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    realization_data = await access.get_realization_data_async(
        table_name=table_name,
        saturation_axis_name=saturation_axis_name,
        curve_names=curve_names,
        satnums=satnums,
        realizations=realizations,
    )

    return converters.to_api_realization_data_response(realization_data)
