from typing import List, Optional, Sequence
from fastapi import APIRouter, Depends, Query

from primary.services.sumo_access.inplace_volumetrics_access import (
    InplaceVolumetricsAccess,
    InplaceVolumetricsTableMetaData,
    InplaceVolumetricsCategoricalMetaData,
)

from primary.services.sumo_access.generic_types import EnsembleScalarResponse
from primary.services.utils.authenticated_user import AuthenticatedUser

from primary.auth.auth_helper import AuthHelper


router = APIRouter()


@router.get("/table_names_and_descriptions/", tags=["inplace_volumetrics"])
async def get_table_names_and_descriptions(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    # fmt:on
) -> List[InplaceVolumetricsTableMetaData]:
    """Get all volumetric tables for a given ensemble."""

    access = await InplaceVolumetricsAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    table_names = access.get_table_names_and_metadata()
    return table_names


@router.post("/realizations_response/", tags=["inplace_volumetrics"])
async def get_realizations_response(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    table_name: str = Query(description="Table name"),
    response_name:str = Query(description="Response name"),
    categorical_filter:Optional[List[InplaceVolumetricsCategoricalMetaData]] = None,
    realizations: Optional[Sequence[int]] = None,
    # fmt:on
) -> EnsembleScalarResponse:
    """Get response for a given table and index filter."""
    access = await InplaceVolumetricsAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    response = access.get_response(table_name, response_name, categorical_filter, realizations)
    return response


# class StatisticFunction(str, Enum):
#     MEAN = "MEAN"
#     MIN = "MIN"
#     MAX = "MAX"
#     P10 = "P10"
#     P90 = "P90"
#     P50 = "P50"


# class StatisticValueObject(BaseModel):
#     statistic_function: StatisticFunction
#     values: List[float]


# class InplaceVolumetricsStatisticResponse(BaseModel):
#     realizations: List[int]
#     value_objects: List[StatisticValueObject]
#     # unit: str
#     # is_rate: bool


# @router.get("/statistic_response/", tags=["inplace_volumetrics"])
# def get_statistic_response(
#     # fmt:off
#     authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
#     case_uuid: str = Query(description="Sumo case uuid"),
#     ensemble_name: str = Query(description="Ensemble name"),
#     table_name: str = Query(description="Table name"),
#     response_name:str = Query(description="Response name"),
#     statistic_functions: Optional[Sequence[StatisticFunction]] = Query(None, description="Optional list of statistics to calculate. If not specified, all statistics will be calculated."),
#     realizations: Optional[Sequence[int]] = Query(None,description="Realizations"),
#     # fmt:on
# ) -> List[InplaceVolumetricsStatisticResponse]:
#     """Get statistical response for a given table and index filter."""
#     access = InplaceVolumetricsAccess(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
#     response = access.get_response(table_name, realizations, response_name)  # , index_filter)
#     # service_stat_funcs_to_compute = _to_service_statistic_functions(statistic_functions)
#     # statistics = compute_inplace_statistics(response, response_name, service_stat_funcs_to_compute)
#     return response
