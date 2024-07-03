import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.table_access import TableAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from .converters import pvt_dataframe_to_api_data
from .schemas import PvtData

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_data/")
async def table_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization number"),
    # fmt:on
) -> List[PvtData]:
    """Get pvt table data for a given Sumo ensemble and realization"""

    access = await TableAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    # Get all table schemas for a given realization and find the pvt table
    table_schemas = await access.get_table_schemas_single_realization_async(realization=realization)

    table_schema = None
    for schema in table_schemas:
        if schema.tagname == "pvt":
            table_schema = schema

    if table_schema is None:
        raise HTTPException(status_code=404, detail="PVT table not found")

    sumo_table_data = await access.get_realization_table_async(table_schema, realization=realization)

    pvt_data = pvt_dataframe_to_api_data(sumo_table_data.to_pandas())

    return pvt_data


# DOES NOT CURRENTLY WORK
@router.get("/realizations_tables_are_equal/")
async def realizations_tables_are_equal(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    # fmt:on
) -> bool:
    """Check if all realizations has the same pvt table"""

    access = await TableAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    # Get all table schemas for a given realization and find the pvt table
    table_schemas = await access.get_table_schemas_single_realization_async(realization=0)
    for schema in table_schemas:
        if schema.tagname == "pvt":
            # Check if all realizations of this table are equal
            return access.realizations_tables_are_equal(table_schema=schema)

    raise HTTPException(status_code=404, detail="PVT table not found")
