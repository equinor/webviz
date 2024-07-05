from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Body

from primary.services.sumo_access.inplace_volumetrics_access import (
    InplaceVolumetricsAccess as InplaceVolumetricsAccessOld,
)
from primary.services.inplace_volumetrics_provider.inplace_volumetrics_provider import InplaceVolumetricsProvider
from primary.services.sumo_access.inplace_volumetrics_acces_NEW import InplaceVolumetricsAccess
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
    access = await InplaceVolumetricsAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    provider = InplaceVolumetricsProvider(access)
    table_names = await provider.get_volumetric_table_metadata()
    return table_names


@router.post("/result_data_per_realization/", tags=["inplace_volumetrics"])
async def get_result_data_per_realization(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    table_name: str = Query(description="Table name"),
    result_name: schemas.InplaceVolumetricResponseNames = Query(
        description="The name of the volumetric result/response"
    ),
    realizations: List[int] = Query(description="Realizations"),
    index_filter: List[schemas.InplaceVolumetricsIndex] = Body(embed=True, description="Categorical filter"),
) -> schemas.InplaceVolumetricData:
    """Get volumetric data summed per realization for a given table, result and categories/index filter."""
    access: InplaceVolumetricsAccessOld = await InplaceVolumetricsAccessOld.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    data = await access.get_volumetric_data_async(
        table_name=table_name, result_name=result_name.value, realizations=realizations, index_filter=index_filter
    )
    return data


@router.post("/get_aggregated_table_data/", tags=["inplace_volumetrics"])
async def post_get_aggregated_table_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    table_name: str = Query(description="Table name"),
    response_names: List[str] = Query(description="The name of the volumetric result/response"),
    fluid_zones: List[schemas.FluidZone] = Query(description="The fluid zones to aggregate by"),
    realizations: Optional[List[int]] = Query(
        None, description="Optional realization to include. If not specified, all realizations will be returned."
    ),
    accumulate_by_indices: List[schemas.InplaceVolumetricsIndex] = Query(description="The index types to aggregate by"),
    index_filter: List[schemas.InplaceVolumetricsIndex] = Body(embed=True, description="Categorical filter"),
    accumulate_fluid_zones: bool = Query(description="Whether to accumulate fluid zones"),
    calculate_mean_across_realizations: bool = Query(description="Whether to calculate mean across realizations"),
) -> schemas.InplaceVolumetricTableDataPerFluidSelection:
    """Get aggregated volumetric data for a given table, result and categories/index filter."""
    access = await InplaceVolumetricsAccess.from_case_uuid_async(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    provider = InplaceVolumetricsProvider(access)

    data = await provider.get_accumulated_by_selection_volumetric_table_data_async(
        table_name=table_name,
        response_names=response_names,
        fluid_zones=fluid_zones,
        accumulate_by_indices=accumulate_by_indices,
        realizations=realizations,
        index_filter=index_filter,
        accumulate_fluid_zones=accumulate_fluid_zones,
        calculate_mean_across_realizations=calculate_mean_across_realizations,
    )

    return converters.convert_table_data_per_fluid_selection_to_schema(data)
