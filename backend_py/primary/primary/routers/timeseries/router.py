import logging
from typing import Annotated

import pyarrow as pa
import pyarrow.compute as pc
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from primary.auth.auth_helper import AuthHelper
from primary.utils.perf_metrics import PerfMetrics
from primary.services.summary_vector_statistics import compute_vector_statistics
from primary.services.sumo_access.generic_types import EnsembleScalarResponse
from primary.services.sumo_access.parameter_access import ParameterAccess
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess
from primary.services.utils.authenticated_user import AuthenticatedUser

from . import converters, schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vector_list/")
async def get_vector_list(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.VectorDescription]:
    """Get list of all vectors in a given Sumo ensemble, excluding any historical vectors"""

    access = await SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    vector_info_arr = await access.get_available_vectors_async()

    ret_arr: list[schemas.VectorDescription] = [
        schemas.VectorDescription(name=vi.name, descriptive_name=vi.name, has_historical=vi.has_historical)
        for vi in vector_info_arr
    ]

    return ret_arr


@router.get("/realizations_vector_data/")
async def get_realizations_vector_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name:  Annotated[str, Query(description="Ensemble name")],
    vector_name:  Annotated[str, Query(description="Name of the vector")],
    resampling_frequency: Annotated[schemas.Frequency | None, Query(description="Resampling frequency. If not specified, raw data without resampling wil be returned.")] = None,
    realizations: Annotated[list[int] | None, Query(description="Optional list of realizations to include. If not specified, all realizations will be returned.")] = None,
    # relative_to_timestamp: Annotated[datetime.datetime | None, Query(description="Calculate relative to timestamp")] = None,
    # fmt:on
) -> list[schemas.VectorRealizationData]:
    """Get vector data per realization"""

    perf_metrics = PerfMetrics(response)
    access = await SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")
    sumo_vec_arr = await access.get_vector_async(
        vector_name=vector_name,
        resampling_frequency=sumo_freq,
        realizations=realizations,
    )
    perf_metrics.record_lap("get-vector")

    ret_arr: list[schemas.VectorRealizationData] = []
    for vec in sumo_vec_arr:
        ret_arr.append(
            schemas.VectorRealizationData(
                realization=vec.realization,
                timestamps_utc_ms=vec.timestamps_utc_ms,
                values=vec.values,
                unit=vec.metadata.unit,
                is_rate=vec.metadata.is_rate,
            )
        )

    LOGGER.info(f"Loaded realization summary data in: {perf_metrics.to_string()}")

    return ret_arr


@router.get("/timestamps_list/")
async def get_timestamps_list(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    resampling_frequency: Annotated[schemas.Frequency | None, Query(description="Resampling frequency")] = None,
    # realizations: Annotated[list[int] | None, Query(description="Optional list of realizations to include")] = None,
) -> list[int]:
    """Get the intersection of available timestamps.
        Note that when resampling_frequency is None, the pure intersection of the
    stored raw dates will be returned. Thus the returned list of dates will not include
    dates from long running realizations.
    For other resampling frequencies, the date range will be expanded to cover the entire
    time range of all the requested realizations before computing the resampled dates.
    """
    access = await SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")
    return await access.get_timestamps_async(resampling_frequency=sumo_freq)


@router.get("/historical_vector_data/")
# type: ignore [empty-body]
async def get_historical_vector_data(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    non_historical_vector_name: Annotated[str, Query(description="Name of the non-historical vector")],
    resampling_frequency: Annotated[schemas.Frequency | None, Query(description="Resampling frequency")] = None,
    # relative_to_timestamp: Annotated[datetime.datetime | None, Query(description="Calculate relative to timestamp")] = None,
) -> schemas.VectorHistoricalData:
    access = await SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")
    sumo_hist_vec = await access.get_matching_historical_vector_async(
        non_historical_vector_name=non_historical_vector_name, resampling_frequency=sumo_freq
    )

    if not sumo_hist_vec:
        raise HTTPException(status_code=404, detail="Could not get historical vector")

    return schemas.VectorHistoricalData(
        timestamps_utc_ms=sumo_hist_vec.timestamps_utc_ms,
        values=sumo_hist_vec.values,
        unit=sumo_hist_vec.metadata.unit,
        is_rate=sumo_hist_vec.metadata.is_rate,
    )


@router.get("/statistical_vector_data/")
async def get_statistical_vector_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name:  Annotated[str, Query(description="Ensemble name")],
    vector_name: Annotated[str, Query(description="Name of the vector")],
    resampling_frequency: Annotated[schemas.Frequency, Query(description="Resampling frequency")],
    statistic_functions: Annotated[list[schemas.StatisticFunction] | None, Query(description="Optional list of statistics to calculate. If not specified, all statistics will be calculated.")] = None,
    realizations: Annotated[list[int] | None, Query(description="Optional list of realizations to include. If not specified, all realizations will be included.")] = None,
    # relative_to_timestamp: Annotated[datetime.datetime | None, Query(description="Calculate relative to timestamp")] = None,
    # fmt:on
) -> schemas.VectorStatisticData:
    """Get statistical vector data for an ensemble"""

    perf_metrics = PerfMetrics(response)

    access = await SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_freq = Frequency.from_string_value(resampling_frequency.value)
    service_stat_funcs_to_compute = converters.to_service_statistic_functions(statistic_functions)

    vector_table, vector_metadata = await access.get_vector_table_async(
        vector_name=vector_name,
        resampling_frequency=service_freq,
        realizations=realizations,
    )
    perf_metrics.record_lap("get-table")

    statistics = compute_vector_statistics(vector_table, vector_name, service_stat_funcs_to_compute)
    if not statistics:
        raise HTTPException(status_code=404, detail="Could not compute statistics")
    perf_metrics.record_lap("calc-stat")

    ret_data: schemas.VectorStatisticData = converters.to_api_vector_statistic_data(statistics, vector_metadata)

    LOGGER.info(f"Loaded and computed statistical summary data in: {perf_metrics.to_string()}")

    return ret_data


@router.get("/statistical_vector_data_per_sensitivity/")
async def get_statistical_vector_data_per_sensitivity(
    # fmt:off
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name:  Annotated[str, Query(description="Ensemble name")],
    vector_name: Annotated[str, Query(description="Name of the vector")],
    resampling_frequency: Annotated[schemas.Frequency, Query(description="Resampling frequency")],
    statistic_functions: Annotated[list[schemas.StatisticFunction] | None, Query(description="Optional list of statistics to calculate. If not specified, all statistics will be calculated.")] = None,
    # relative_to_timestamp: Annotated[datetime.datetime | None, Query(description="Calculate relative to timestamp")] = None,
    # fmt:on
) -> list[schemas.VectorStatisticSensitivityData]:
    """Get statistical vector data for an ensemble per sensitivity"""

    summmary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameter_access = await ParameterAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sensitivities = (await parameter_access.get_parameters_and_sensitivities()).sensitivities

    service_freq = Frequency.from_string_value(resampling_frequency.value)
    service_stat_funcs_to_compute = converters.to_service_statistic_functions(statistic_functions)
    vector_table, vector_metadata = await summmary_access.get_vector_table_async(
        vector_name=vector_name, resampling_frequency=service_freq, realizations=None
    )
    ret_data: list[schemas.VectorStatisticSensitivityData] = []
    if not sensitivities:
        return ret_data
    for sensitivity in sensitivities:
        for case in sensitivity.cases:
            mask = pc.is_in(vector_table["REAL"], value_set=pa.array(case.realizations))
            table = vector_table.filter(mask)

            statistics = compute_vector_statistics(table, vector_name, service_stat_funcs_to_compute)
            if not statistics:
                raise HTTPException(status_code=404, detail="Could not compute statistics")

            statistic_data: schemas.VectorStatisticData = converters.to_api_vector_statistic_data(
                statistics, vector_metadata
            )
            sensitivity_statistic_data = schemas.VectorStatisticSensitivityData(
                sensitivity_name=sensitivity.name,
                sensitivity_case=case.name,
                realizations=statistic_data.realizations,
                timestamps_utc_ms=statistic_data.timestamps_utc_ms,
                value_objects=statistic_data.value_objects,
                unit=statistic_data.unit,
                is_rate=statistic_data.is_rate,
            )
            ret_data.append(sensitivity_statistic_data)
    return ret_data


@router.get("/realization_vector_at_timestamp/")
async def get_realization_vector_at_timestamp(
    # fmt:off
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name:  Annotated[str, Query(description="Ensemble name")],
    vector_name: Annotated[str, Query(description="Name of the vector")],
    timestamp_utc_ms: Annotated[int, Query(description= "Timestamp in ms UTC to query vectors at")],
    # realizations: Annotated[list[int] | None, Query(description="Optional list of realizations to include. If not specified, all realizations will be returned.")] = None,
    # fmt:on
) -> EnsembleScalarResponse:
    summary_access = await SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    ensemble_response = await summary_access.get_vector_values_at_timestamp_async(
        vector_name=vector_name, timestamp_utc_ms=timestamp_utc_ms, realizations=None
    )
    return ensemble_response


# @router.get("/realizations_calculated_vector_data/")
# def get_realizations_calculated_vector_data(
#     authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
#     case_uuid: Annotated[str, Query(description="Sumo case uuid")],
#     ensemble_name: Annotated[str, Query(description="Ensemble name")],
#     expression: Annotated[schemas.VectorExpressionInfo, Depends()],
#     resampling_frequency: Annotated[schemas.Frequency, Query(description="Resampling frequency")],
#     relative_to_timestamp: Annotated[datetime.datetime | None, Query(description="Calculate relative to timestamp")] = None,
# ) -> str:
#     """Get calculated vector data per realization"""
#     print(expression)
#     print(type(expression))
#     return "hei"
