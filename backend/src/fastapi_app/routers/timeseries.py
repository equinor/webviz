import datetime
from typing import List, Optional, Union, Sequence

from fastapi import APIRouter, Query, Depends

from ...services.sumo_access.summary_access import SummaryAccess
from ...services.utils.authenticated_user import AuthenticatedUser

from ..auth.auth_helper import AuthHelper
from .. import schemas


router = APIRouter()


@router.get("/vector_names_and_description/", tags=["timeseries"])
async def get_vector_names_and_descriptions(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    exclude_all_values_zero: bool = Query(default=False, description="Exclude all vectors where all values are zero"),
    exclude_all_values_constant: bool = Query(default=False, description="Exclude all vectors where all values are the same value"
    ),
) -> List[schemas.timeseries.VectorDescription]:
    """Get all vector names and descriptive names in a given Sumo ensemble"""

    access = SummaryAccess(authenticated_user.get_sumo_access_token(), case_uuid=case_uuid, iteration_name=ensemble_name)
    vector_names = access.get_vector_names()

    ret_arr: List[schemas.timeseries.VectorDescription] = [
        schemas.timeseries.VectorDescription(name=vector_name, descriptive_name=vector_name, has_historical=False) for vector_name in vector_names
    ]

    return ret_arr


@router.get("/realizations_vector_data/", tags=["timeseries"])
async def get_realizations_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    vector_name: str = Query(description="Name of the vector"),
    resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(None, description="Resampling frequency"),
    realizations: Union[Sequence[int], None] = Query(None, description="Optional list of realizations to include"),
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> List[schemas.timeseries.VectorRealizationData]:
    """Get vector data per realization"""

    access = SummaryAccess(authenticated_user.get_sumo_access_token(), case_uuid=case_uuid, iteration_name=ensemble_name)
    vector_data = access.get_vector_realizations_data(vector_name=vector_name)

    return vector_data if vector_data else []


@router.get("/vector_metadata/", tags=["timeseries"])
async def get_vector_metadata(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    vector_name: str = Query(description="Name of the vector"),
) -> schemas.timeseries.VectorMetadata:
    """Get metadata for the specified vector. Returns None if no metadata
    exists or if any of the non-optional properties of `VectorMetadata` are missing."""

    ...


@router.get("/timestamps/", tags=["timeseries"])
async def get_timestamps(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(None, description="Resampling frequency"),
    realizations: Union[Sequence[int], None] = Query(None, description="Optional list of realizations to include"),
) -> List[datetime.datetime]:
    """Get the intersection of available timestamps.
        Note that when resampling_frequency is None, the pure intersection of the
    stored raw dates will be returned. Thus the returned list of dates will not include
    dates from long running realizations.
    For other resampling frequencies, the date range will be expanded to cover the entire
    time range of all the requested realizations before computing the resampled dates."""

    ...


@router.get("/historical_vector_data/", tags=["timeseries"])
async def get_historical_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    non_historical_vector_name: str = Query(description="Name of the non-historical vector"),
    resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(None, description="Resampling frequency"),  # ??
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> schemas.timeseries.VectorHistoricalData:
    ...


@router.get("/statistical_vector_data/", tags=["timeseries"])
async def get_statistical_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    statistic: List[schemas.timeseries.StatisticsOptions] = Query(description="Statistical calculations to apply"),
    vector_name: str = Query(description="Name of the vector"),
    resampling_frequency: schemas.timeseries.Frequency = Query(None, description="Resampling frequency"),
    realizations: Union[Sequence[int], None] = Query(None, description="Optional list of realizations to include"),
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> List[schemas.timeseries.VectorRealizationData]:
    """Get statistical vector data for an ensemble"""
    ...


@router.get("/realizations_calculated_vector_data/", tags=["timeseries"])
async def get_realizations_calculated_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    ensemble_name: str = Query(description="Ensemble name"),
    expression: schemas.timeseries.VectorExpressionInfo = Depends(),
    resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(None, description="Resampling frequency"),
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> str:
    """Get calculated vector data per realization"""
    print(expression)
    print(type(expression))
    return "hei"


# @router.get("/statistical_calculated_vector_data/", tags=["timeseries"])
# async def get_statistical_calculated_vector_data(
#     authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
#     sumo_case_id: str = Query(None, description="Sumo case id"),
#     sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
#     statistic: List[schemas.timeseries.StatisticsOptions] = Query(
#         None, description="Statistical calculations to apply"
#     ),
#     vector_name: str = Query(None, description="Name of the vector"),
#     resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(None, description="Resampling frequency"),
#     realizations: Union[Sequence[int], None] = Query(None, description="Optional list of realizations to include"),
#     relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
#     expressions: Optional[List[schemas.timeseries.VectorExpressionInfo]] = None,
# ) -> List[schemas.timeseries.VectorRealizationData]:
#     """Get calculated vector data for an ensemble"""
#     ...
