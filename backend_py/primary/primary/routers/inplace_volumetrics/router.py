from typing import List

from fastapi import APIRouter, Depends, Query, Body
from primary.services.sumo_access.inplace_volumetrics_access import InplaceVolumetricsAccess


from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper


from . import schemas
from . import converters

router = APIRouter()


@router.get("/table_definitions/", tags=["inplace_volumetrics"])
async def get_table_definitions(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
) -> List[schemas.InplaceVolumetricsTableDefinition]:
    """Get the volumetric tables definitions for a given ensemble."""

    access = await InplaceVolumetricsAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    table_names = await access.get_inplace_volumetrics_table_definitions_async()
    return table_names


@router.get("/result_data_per_realization/", tags=["inplace_volumetrics"])
async def get_result_data_per_realization(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    table_name: str = Query(description="Table name"),
    result_name: schemas.InplaceVolumetricResponseNames = Query(
        description="The name of the volumetric result/response"
    ),
    realizations: List[int] = Query(description="Realizations"),
) -> schemas.InplaceVolumetricData:
    """Get volumetric data summed per realization for a given table, result and categories/index filter."""
    access = await InplaceVolumetricsAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    data = await access.get_volumetric_data_async(
        table_name=table_name,
        result_name=result_name.value,
        realizations=realizations,
    )
    return data
