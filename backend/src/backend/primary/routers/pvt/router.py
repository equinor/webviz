import logging
from typing import List, Optional, Sequence, Union

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import ORJSONResponse

from src.backend.auth.auth_helper import AuthHelper
from src.services.sumo_access.table_access import TableAccess
from src.services.types.generic_types import EnsembleScalarResponse, TableMetaData
from src.services.utils.authenticated_user import AuthenticatedUser

# from . import schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/table_metadata/")
def table_metadata(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization number"),
    # fmt:on
) -> TableMetaData:
    """Get pvt table metadata for a given Sumo ensemble and realization"""

    # Hardcoded for now
    case_uuid = "356ae2c4-f513-4fcd-af30-6d7a3cc3f007"
    ensemble_name = "iter-0"

    access = TableAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    tables_metadata = access.get_realization_tables_metadata(realization=realization)
    for table_metadata in tables_metadata:
        if table_metadata.tagname == "pvt":
            return table_metadata
    raise HTTPException(status_code=404, detail="PVT table not found")


@router.get("/table_data/")
def table_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    realization: int = Query(description="Realization number"),
    # table_metadata: TableMetaData = Depends(table_metadata),
    # fmt:on
) -> TableMetaData:
    """Get pvt table data for a given Sumo ensemble and realization"""

    # Hardcoded for now
    case_uuid = "356ae2c4-f513-4fcd-af30-6d7a3cc3f007"
    ensemble_name = "iter-0"

    access = TableAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    # This should be a query parameter
    tables_metadata = access.get_realization_tables_metadata(realization=realization)
    for table_metadata in tables_metadata:
        if table_metadata.tagname == "pvt":
            table = table_metadata
    print(access.realizations_tables_are_equal(table_metadata=table))
    if table is not None:
        table_data = access.get_realization_table(table, realization=realization)
        return ORJSONResponse(table_data.to_pandas().to_json(orient="records"))

    raise HTTPException(status_code=404, detail="PVT table not found")


# DOES NOT CURRENTLY WORK
@router.get("/realizations_tables_are_equal/")
def realizations_tables_are_equal(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    # table_metadata: TableMetaData = Depends(table_metadata),
    # fmt:on
) -> bool:
    """Check if all realizations of a given table are equal"""

    # Hardcoded for now
    case_uuid = "356ae2c4-f513-4fcd-af30-6d7a3cc3f007"
    ensemble_name = "iter-0"

    access = TableAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    # This should be a query parameter
    tables_metadata = access.get_realization_tables_metadata(realization=0)
    for table_metadata in tables_metadata:
        if table_metadata.tagname == "pvt":
            table = table_metadata
            return access.realizations_tables_are_equal(table_metadata=table)

    raise HTTPException(status_code=404, detail="PVT table not found")
