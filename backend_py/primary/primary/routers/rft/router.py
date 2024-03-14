import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.rft_access import RftAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/rft_info")
async def get_rft_info(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.RftInfo]:
    access = await RftAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    rft_well_list = await access.get_rft_info()

    return rft_well_list


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
    access = await RftAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    data = await access.get_rft_well_realization_data(
        well_name=well_name,
        response_name=response_name,
        timestamps_utc_ms=timestamps_utc_ms,
        realizations=realizations,
    )

    return data
