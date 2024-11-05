import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.relperm_access import RelPermAccess
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
) -> List[schemas.RelPermTableInfo]:
    access = await RelPermAccess.from_case_uuid_async(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    relperm_tables_info = await access.get_relperm_tables_info()
    return [converters.to_api_relperm_table_info(table_info) for table_info in relperm_tables_info]
    
