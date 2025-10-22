import logging

from fastapi import APIRouter, Depends, Query

from primary.services.pdm_access.pdm_access import PDMAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/production-data/")
async def get_production_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    start_date: str = Query(description="Start date in YYYY-MM-DD"),
    end_date: str = Query(description="End date in YYYY-MM-DD"),
    # fmt:on
) -> list[schemas.WellProductionData]:
    """Get allocated production per well in the time interval"""
    pdm_access = PDMAccess(authenticated_user.get_pdm_access_token())
    prod_data = await pdm_access.get_per_well_production_in_time_interval_async(
        field_identifier=field_identifier, start_date=start_date, end_date=end_date
    )
    return converters.per_well_production_data_to_api(prod_data)


# Injection Endpoint
@router.get("/injection-data/")
async def get_injection_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    field_identifier: str = Query(description="Official field identifier"),
    start_date: str = Query(description="Start date in YYYY-MM-DD"),
    end_date: str = Query(description="End date in YYYY-MM-DD"),
    # fmt:on
) -> list[schemas.WellInjectionData]:
    """Get allocated injection per well in the time interval"""
    pdm_access = PDMAccess(authenticated_user.get_pdm_access_token())
    data = await pdm_access.get_per_well_injection_in_time_interval_async(
        field_identifier=field_identifier, start_date=start_date, end_date=end_date
    )
    return converters.per_well_injection_data_to_api(data)
