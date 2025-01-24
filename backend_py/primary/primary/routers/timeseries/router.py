import logging
from typing import Annotated

import pyarrow as pa
import pyarrow.compute as pc
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from primary.auth.auth_helper import AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.services.summary_vector_statistics import compute_vector_statistics
from primary.services.sumo_access.generic_types import EnsembleScalarResponse
from primary.services.sumo_access.parameter_access import ParameterAccess
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.services.summary_delta_vectors import create_delta_vector_table, create_realization_delta_vector_list
from primary.services.summary_from_cumulative_vectors import (
    create_per_day_vector_name,
    create_per_interval_vector_name,
    create_per_interval_vector_table_pa,
    create_per_day_vector_table_pa,
    create_realization_from_cumulative_vector_list,
    get_total_vector_name,
    is_per_day_vector,
    is_per_interval_vector,
    is_total_vector,
)
from primary.utils.query_string_utils import decode_uint_list_str

from . import converters, schemas
import asyncio

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vector_list/")
async def get_vector_list(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    include_cumulative_vectors: Annotated[bool | None, Query(description="Include cumulative vectors")] = None,
) -> list[schemas.VectorDescription]:
    """Get list of all vectors in a given Sumo ensemble, excluding any historical vectors"""

    perf_metrics = ResponsePerfMetrics(response)

    access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    perf_metrics.record_lap("get-access")

    vector_info_arr = await access.get_available_vectors_async()
    perf_metrics.record_lap("get-available-vectors")

    ret_arr: list[schemas.VectorDescription] = [
        schemas.VectorDescription(name=vi.name, descriptive_name=vi.name, has_historical=vi.has_historical)
        for vi in vector_info_arr
    ]

    perf_metrics.record_lap("convert-data")

    if not include_cumulative_vectors:
        LOGGER.info(f"Got vector list in: {perf_metrics.to_string()}")
        return ret_arr

    for vec in vector_info_arr:
        if not is_total_vector(vec.name):
            continue

        per_day_vector_name = create_per_day_vector_name(vec.name)
        per_interval_vector_name = create_per_interval_vector_name(vec.name)
        ret_arr.extend(
            [
                schemas.VectorDescription(
                    name=per_day_vector_name, descriptive_name=per_day_vector_name, has_historical=False
                ),
                schemas.VectorDescription(
                    name=per_interval_vector_name, descriptive_name=per_interval_vector_name, has_historical=False
                ),
            ]
        )

    LOGGER.info(f"Got vector list in: {perf_metrics.to_string()}")

    return ret_arr


@router.get("/cumulative_vector_list/")
async def get_cumulative_vector_list(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
) -> list[schemas.VectorDescription]:
    """Get list of all cumulative vectors in a given Sumo ensemble, excluding any historical vectors"""

    perf_metrics = ResponsePerfMetrics(response)

    access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    perf_metrics.record_lap("get-access")

    vector_info_arr = await access.get_available_vectors_async()
    perf_metrics.record_lap("get-available-vectors")

    ret_arr: list[schemas.VectorDescription] = []
    for vec in vector_info_arr:
        if not is_total_vector(vec.name):
            continue

        per_day_vector_name = create_per_day_vector_name(vec.name)
        per_interval_vector_name = create_per_interval_vector_name(vec.name)
        ret_arr.extend(
            [
                schemas.VectorDescription(
                    name=per_day_vector_name, descriptive_name=per_day_vector_name, has_historical=False
                ),
                schemas.VectorDescription(
                    name=per_interval_vector_name, descriptive_name=per_interval_vector_name, has_historical=False
                ),
            ]
        )

    perf_metrics.record_lap("convert-data")

    LOGGER.info(f"Got cumulative vector list in: {perf_metrics.to_string()}")

    return ret_arr


@router.get("/delta_ensemble_vector_list/")
async def get_delta_ensemble_vector_list(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    comparison_case_uuid: Annotated[str, Query(description="Sumo case uuid for comparison ensemble")],
    comparison_ensemble_name: Annotated[str, Query(description="Comparison ensemble name")],
    reference_case_uuid: Annotated[str, Query(description="Sumo case uuid for reference ensemble")],
    reference_ensemble_name: Annotated[str, Query(description="Reference ensemble name")],
) -> list[schemas.VectorDescription]:
    """Get list of all vectors for a delta ensemble based on all vectors in a given Sumo ensemble, excluding any historical vectors

    Definition:

        delta_ensemble = comparison_ensemble - reference_ensemble
    """

    perf_metrics = ResponsePerfMetrics(response)

    comparison_ensemble_access = SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), reference_case_uuid, reference_ensemble_name
    )
    perf_metrics.record_lap("get-access")

    # Get vectors parallel
    comparison_vector_info_arr, reference_vector_info_arr = await asyncio.gather(
        comparison_ensemble_access.get_available_vectors_async(),
        reference_ensemble_access.get_available_vectors_async(),
    )
    perf_metrics.record_lap("get-available-vectors")

    # Create intersection of vector names
    vector_names = {vi.name for vi in comparison_vector_info_arr}
    vector_names.intersection_update({vi.name for vi in reference_vector_info_arr})
    perf_metrics.record_lap("create-vectors-names-intersection")

    # Create vector descriptions, no historical vectors!
    ret_arr: list[schemas.VectorDescription] = [
        schemas.VectorDescription(name=vi, descriptive_name=vi, has_historical=False) for vi in vector_names
    ]

    perf_metrics.record_lap("convert-data-to-schema")

    LOGGER.info(f"Got delta ensemble vector list in: {perf_metrics.to_string()}")

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
    realizations_encoded_as_uint_list_str: Annotated[str | None, Query(description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included.")] = None,
    # fmt:on
) -> list[schemas.VectorRealizationData]:
    """Get vector data per realization"""

    perf_metrics = ResponsePerfMetrics(response)

    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")

    ret_arr: list[schemas.VectorRealizationData] = []
    if is_per_interval_vector(vector_name):
        "PER_DAY_WOPT:A1"
        total_vector_name = get_total_vector_name(vector_name)

        total_vector_table_pa, total_vector_metadata = await access.get_vector_table_async(
            vector_name=total_vector_name,
            resampling_frequency=sumo_freq,
            realizations=realizations,
        )
        perf_metrics.record_lap("get-total-vector-table")

        # Generate per interval vector
        per_interval_vector_table = create_per_interval_vector_table_pa(total_vector_table_pa)
        perf_metrics.record_lap("create-per-interval-vector-table")

        unit = total_vector_metadata.unit

        per_interval_vector_list = create_realization_from_cumulative_vector_list(
            per_interval_vector_table, vector_name, unit
        )
        for vec in per_interval_vector_list:
            ret_arr.append(
                schemas.VectorRealizationData(
                    realization=vec.realization,
                    timestamps_utc_ms=vec.timestamps_utc_ms,
                    values=vec.values,
                    unit=vec.unit,
                    is_rate=False,
                )
            )

    elif is_per_day_vector(vector_name):
        total_vector_name = get_total_vector_name(vector_name)

        total_vector_table_pa, total_vector_metadata = await access.get_vector_table_async(
            vector_name=total_vector_name,
            resampling_frequency=sumo_freq,
            realizations=realizations,
        )
        perf_metrics.record_lap("get-total-vector-table")

        # Generate per day vector
        per_day_vector_table = create_per_day_vector_table_pa(total_vector_table_pa)
        perf_metrics.record_lap("create-per-day-vector-table")

        unit = f"{total_vector_metadata.unit}/day"

        per_day_vector_list = create_realization_from_cumulative_vector_list(per_day_vector_table, vector_name, unit)
        for vec in per_day_vector_list:
            ret_arr.append(
                schemas.VectorRealizationData(
                    realization=vec.realization,
                    timestamps_utc_ms=vec.timestamps_utc_ms,
                    values=vec.values,
                    unit=vec.unit,
                    is_rate=True,
                )
            )

    else:
        sumo_vec_arr = await access.get_vector_async(
            vector_name=vector_name,
            resampling_frequency=sumo_freq,
            realizations=realizations,
        )
        perf_metrics.record_lap("get-vector")

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


@router.get("/delta_ensemble_realizations_vector_data/")
async def get_delta_ensemble_realizations_vector_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    comparison_case_uuid: Annotated[str, Query(description="Sumo case uuid for comparison ensemble")],
    comparison_ensemble_name: Annotated[str, Query(description="Comparison ensemble name")],
    reference_case_uuid: Annotated[str, Query(description="Sumo case uuid for reference ensemble")],
    reference_ensemble_name: Annotated[str, Query(description="Reference ensemble name")],
    vector_name:  Annotated[str, Query(description="Name of the vector")],
    resampling_frequency: Annotated[schemas.Frequency, Query(description="Resampling frequency")],
    realizations_encoded_as_uint_list_str: Annotated[str | None, Query(description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included.")] = None,
    # fmt:on
) -> list[schemas.VectorRealizationData]:
    """Get vector data per realization

    Definition:

        delta_ensemble = comparison_ensemble - reference_ensemble

    """

    perf_metrics = ResponsePerfMetrics(response)

    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    service_freq = Frequency.from_string_value(resampling_frequency.value)
    if service_freq is None:
        raise HTTPException(
            status_code=400, detail="Resampling frequency must be specified to create delta ensemble vector"
        )

    comparison_ensemble_access = SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), reference_case_uuid, reference_ensemble_name
    )

    # Get tables parallel
    # - Resampled data is assumed to be such that dates/timestamps are comparable between ensembles and cases, i.e. timestamps
    #   for a resampling of a daily vector in both ensembles should be the same
    (comparison_vector_table_pa, comparison_metadata), (
        reference_vector_table_pa,
        reference_metadata,
    ) = await asyncio.gather(
        comparison_ensemble_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=service_freq,
            realizations=realizations,
        ),
        reference_ensemble_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=service_freq,
            realizations=realizations,
        ),
    )

    perf_metrics.record_lap("get-vector-tables-for-delta")

    # Check for mismatching metadata
    if comparison_metadata.is_rate != reference_metadata.is_rate:
        raise HTTPException(
            status_code=400, detail="Rate mismatch between ensembles for delta ensemble statistical vector data"
        )
    if comparison_metadata.unit != reference_metadata.unit:
        raise HTTPException(
            status_code=400, detail="Unit mismatch between ensembles for delta ensemble statistical vector data"
        )

    # Get metadata from reference ensemble
    is_rate = reference_metadata.is_rate
    unit = reference_metadata.unit

    # Create delta ensemble data
    delta_vector_table = create_delta_vector_table(comparison_vector_table_pa, reference_vector_table_pa, vector_name)
    perf_metrics.record_lap("create-delta-vector-table")

    realization_delta_vector_list = create_realization_delta_vector_list(delta_vector_table, vector_name, is_rate, unit)
    perf_metrics.record_lap("create-realization-delta-vector-list")

    ret_arr: list[schemas.VectorRealizationData] = []
    for vec in realization_delta_vector_list:
        ret_arr.append(
            schemas.VectorRealizationData(
                realization=vec.realization,
                timestamps_utc_ms=vec.timestamps_utc_ms,
                values=vec.values,
                unit=vec.unit,
                is_rate=vec.is_rate,
            )
        )

    LOGGER.info(f"Loaded realization delta ensemble summary data in: {perf_metrics.to_string()}")

    return ret_arr


@router.get("/timestamps_list/")
async def get_timestamps_list(
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    resampling_frequency: Annotated[schemas.Frequency | None, Query(description="Resampling frequency")] = None,
) -> list[int]:
    """Get the intersection of available timestamps.
        Note that when resampling_frequency is None, the pure intersection of the
    stored raw dates will be returned. Thus the returned list of dates will not include
    dates from long running realizations.
    For other resampling frequencies, the date range will be expanded to cover the entire
    time range of all the requested realizations before computing the resampled dates.
    """
    access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
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
) -> schemas.VectorHistoricalData:
    access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

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
    realizations_encoded_as_uint_list_str: Annotated[str | None, Query(description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included.")] = None,
    # fmt:on
) -> schemas.VectorStatisticData:
    """Get statistical vector data for an ensemble"""

    perf_metrics = ResponsePerfMetrics(response)

    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

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


@router.get("/delta_ensemble_statistical_vector_data/")
async def get_delta_ensemble_statistical_vector_data(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    comparison_case_uuid: Annotated[str, Query(description="Sumo case uuid for comparison ensemble")],
    comparison_ensemble_name: Annotated[str, Query(description="Comparison ensemble name")],
    reference_case_uuid: Annotated[str, Query(description="Sumo case uuid for reference ensemble")],
    reference_ensemble_name: Annotated[str, Query(description="Reference ensemble name")],
    vector_name: Annotated[str, Query(description="Name of the vector")],
    resampling_frequency: Annotated[schemas.Frequency, Query(description="Resampling frequency")],
    statistic_functions: Annotated[list[schemas.StatisticFunction] | None, Query(description="Optional list of statistics to calculate. If not specified, all statistics will be calculated.")] = None,
    realizations_encoded_as_uint_list_str: Annotated[str | None, Query(description="Optional list of realizations encoded as string to include. If not specified, all realizations will be included.")] = None,
    # fmt:on
) -> schemas.VectorStatisticData:
    """Get statistical vector data for an ensemble

    Definition:

        delta_ensemble = comparison_ensemble - reference_ensemble

    """

    perf_metrics = ResponsePerfMetrics(response)

    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    service_freq = Frequency.from_string_value(resampling_frequency.value)
    service_stat_funcs_to_compute = converters.to_service_statistic_functions(statistic_functions)

    if service_freq is None:
        raise HTTPException(
            status_code=400, detail="Resampling frequency must be specified to create delta ensemble vector"
        )

    comparison_ensemble_access = SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_case_uuid(
        authenticated_user.get_sumo_access_token(), reference_case_uuid, reference_ensemble_name
    )

    # Get tables parallel
    # - Resampled data is assumed to be such that dates/timestamps are comparable between ensembles and cases, i.e. timestamps
    #   for a resampling of a daily vector in both ensembles should be the same
    (comparison_vector_table_pa, comparison_metadata), (
        reference_vector_table_pa,
        reference_metadata,
    ) = await asyncio.gather(
        comparison_ensemble_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=service_freq,
            realizations=realizations,
        ),
        reference_ensemble_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=service_freq,
            realizations=realizations,
        ),
    )

    perf_metrics.record_lap("get-vector-tables-for-delta")

    # Check for mismatching metadata
    if comparison_metadata.is_rate != reference_metadata.is_rate:
        raise HTTPException(
            status_code=400, detail="Rate mismatch between ensembles for delta ensemble statistical vector data"
        )
    if comparison_metadata.unit != reference_metadata.unit:
        raise HTTPException(
            status_code=400, detail="Unit mismatch between ensembles for delta ensemble statistical vector data"
        )

    # Get metadata from reference ensemble
    is_rate = reference_metadata.is_rate
    unit = reference_metadata.unit

    # Create delta ensemble data and compute statistics
    delta_vector_table = create_delta_vector_table(comparison_vector_table_pa, reference_vector_table_pa, vector_name)
    statistics = compute_vector_statistics(delta_vector_table, vector_name, service_stat_funcs_to_compute)
    if not statistics:
        raise HTTPException(status_code=404, detail="Could not compute statistics")
    perf_metrics.record_lap("calc-delta-vector-stat")

    ret_data: schemas.VectorStatisticData = converters.to_api_delta_ensemble_vector_statistic_data(
        statistics, is_rate, unit
    )

    LOGGER.info(f"Loaded and computed statistical delta ensemble summary data in: {perf_metrics.to_string()}")

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
    realizations_encoded_as_uint_list_str: Annotated[str | None, Query(description="Optional list of realizations to include. If not specified, all realizations will be included.")] = None,
    # fmt:on
) -> list[schemas.VectorStatisticSensitivityData]:
    """Get statistical vector data for an ensemble per sensitivity"""

    realizations: list[int] | None = None
    if realizations_encoded_as_uint_list_str:
        realizations = decode_uint_list_str(realizations_encoded_as_uint_list_str)

    summmary_access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    parameter_access = await ParameterAccess.from_case_uuid_async(
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

    requested_realizations_mask = (
        pc.is_in(vector_table["REAL"], value_set=pa.array(realizations)) if realizations else None
    )
    for sensitivity in sensitivities:
        for case in sensitivity.cases:
            sens_case_realization_mask = pc.is_in(vector_table["REAL"], value_set=pa.array(case.realizations))
            if requested_realizations_mask is not None:
                sens_case_realization_mask = pc.and_(requested_realizations_mask, sens_case_realization_mask)
            table = vector_table.filter(sens_case_realization_mask)

            if table.num_rows == 0 and requested_realizations_mask is not None:
                raise HTTPException(
                    status_code=404,
                    detail="The combination of realizations to include and sensitivity case realizations results in no valid realizations",
                )

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
    # fmt:on
) -> EnsembleScalarResponse:
    summary_access = SummaryAccess.from_case_uuid(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    ensemble_response = await summary_access.get_vector_values_at_timestamp_async(
        vector_name=vector_name, timestamp_utc_ms=timestamp_utc_ms, realizations=None
    )
    return ensemble_response
