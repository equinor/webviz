import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.rft_access import RftAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_definition")
async def get_table_definition(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> schemas.RftTableDefinition:
    access = await RftAccess.from_case_uuid_async(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    rft_table_def = await access.get_rft_info()

    return converters.to_api_table_definition(rft_table_def)


@router.get("/realization_data")
async def get_realization_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    well_name: Annotated[str, Query(description="Well name")],
    response_name: Annotated[str, Query(description="Response name")],
    timestamps_utc_ms: Annotated[list[int] | None, Query(description="Timestamps utc ms")] = None,
    realizations: Annotated[list[int] | None, Query(description="Realizations")] = None,
) -> list[schemas.RftRealizationData]:
    access = await RftAccess.from_case_uuid_async(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    data = await access.get_rft_well_realization_data(
        well_name=well_name,
        response_name=response_name,
        timestamps_utc_ms=timestamps_utc_ms,
        realizations=realizations,
    )

    ret_data: list[schemas.RftRealizationData] = []
    for item in data:
        ret_data.append(
            schemas.RftRealizationData(
                well_name=item.well_name,
                realization=item.realization,
                timestamp_utc_ms=item.timestamp_utc_ms,
                depth_arr=item.depth_arr,
                value_arr=item.value_arr,
            )
        )

    return ret_data
