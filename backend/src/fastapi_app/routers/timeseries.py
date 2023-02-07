import datetime
from typing import List, Optional, Union, Sequence

from fastapi import APIRouter, Query, Depends

from ...services.sumo_access.discovery import Discovery
from ...services.sumo_access.case_access import CaseAccess
from ...services.utils.authenticated_user import AuthenticatedUser

from ..auth.auth_helper import AuthHelper
from .. import schemas
from ..config import SUMO_CONFIG

router = APIRouter()


@router.get("/case_ids/", tags=["timeseries"])
async def get_case_ids(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
) -> List[str]:
    """Test function to get valid case ids"""
    sumo_discovery = Discovery(authenticated_user.get_sumo_access_token())
    case_ids = sumo_discovery.get_case_ids_with_smry_data(SUMO_CONFIG["field"])
    print(case_ids)
    return case_ids


@router.get("/vector_names_and_description/", tags=["timeseries"])
async def get_vector_names_and_descriptions(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sumo_case_id: str = Query(None, description="Sumo case id"),
    sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
    exclude_all_values_zero: bool = Query(False, description="Exclude all vectors where all values are zero"),
    exclude_all_values_constant: bool = Query(
        False, description="Exclude all vectors where all values are the same value"
    ),
) -> List[schemas.timeseries.VectorDescription]:
    """Get all vector names and descriptive names in a given Sumo ensemble"""

    case = CaseAccess(authenticated_user.get_sumo_access_token(), sumo_case_id)
    vector_names = case.get_vector_names(iteration_id=sumo_iteration_id)
    return [
        schemas.timeseries.VectorDescription(name=vector_name, descriptive_name=vector_name, has_historical=False)
        for vector_name in vector_names
    ]


@router.get("/realizations_vector_data/", tags=["timeseries"])
async def get_realizations_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sumo_case_id: str = Query(None, description="Sumo case id"),
    sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
    vector_name: str = Query(None, description="Name of the vector"),
    resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(None, description="Resampling frequency"),
    realizations: Union[Sequence[int], None] = Query(None, description="Optional list of realizations to include"),
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> List[schemas.timeseries.VectorRealizationData]:
    """Get vector data per realization"""
    case = CaseAccess(authenticated_user.get_sumo_access_token(), sumo_case_id)
    vector_data = case.get_vector_realizations_data(iteration_id=sumo_iteration_id, vector_name=vector_name)
    return vector_data if vector_data else []


@router.get("/vector_metadata/", tags=["timeseries"])
async def get_vector_metadata(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sumo_case_id: str = Query(None, description="Sumo case id"),
    sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
    vector_name: str = Query(None, description="Sumo case id"),
) -> schemas.timeseries.VectorMetadata:
    """Get metadata for the specified vector. Returns None if no metadata
    exists or if any of the non-optional properties of `VectorMetadata` are missing."""

    ...


@router.get("/timestamps/", tags=["timeseries"])
async def get_timestamps(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sumo_case_id: str = Query(None, description="Sumo case id"),
    sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
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
    sumo_case_id: str = Query(None, description="Sumo case id"),
    non_historical_vector_name: str = Query(None, description="Name of the non-historical vector"),
    resampling_frequency: Optional[schemas.timeseries.Frequency] = Query(
        None, description="Resampling frequency"
    ),  # ??
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> schemas.timeseries.VectorHistoricalData:
    ...


@router.get("/statistical_vector_data/", tags=["timeseries"])
async def get_statistical_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sumo_case_id: str = Query(None, description="Sumo case id"),
    sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
    statistic: List[schemas.timeseries.StatisticsOptions] = Query(
        None, description="Statistical calculations to apply"
    ),
    vector_name: str = Query(None, description="Name of the vector"),
    resampling_frequency: schemas.timeseries.Frequency = Query(None, description="Resampling frequency"),
    realizations: Union[Sequence[int], None] = Query(None, description="Optional list of realizations to include"),
    relative_to_timestamp: Optional[datetime.datetime] = Query(None, description="Calculate relative to timestamp"),
) -> List[schemas.timeseries.VectorRealizationData]:
    """Get statistical vector data for an ensemble"""
    ...


@router.get("/realizations_calculated_vector_data/", tags=["timeseries"])
async def get_realizations_calculated_vector_data(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    sumo_case_id: str = Query(None, description="Sumo case id"),
    sumo_iteration_id: str = Query(None, description="Sumo iteration id"),
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
