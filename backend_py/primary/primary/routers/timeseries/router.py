import logging
from typing import Annotated

import pyarrow as pa
import pyarrow.compute as pc
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from primary.auth.auth_helper import AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.services.summary_vector_statistics import compute_vector_statistics, VectorStatistics
from primary.services.sumo_access.generic_types import EnsembleScalarResponse
from primary.services.sumo_access.parameter_access import ParameterAccess
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.services.summary_delta_vectors import (
    DeltaVectorMetadata,
    RealizationDeltaVector,
    create_delta_vector_table,
    create_realization_delta_vector_list,
)
from primary.services.summary_derived_vectors import (
    create_derived_vector_table_for_type,
    create_per_day_vector_name,
    create_per_interval_vector_name,
    create_derived_vector_unit,
    create_derived_realization_vector_list,
    get_derived_vector_type,
    get_total_vector_name,
    is_derived_vector,
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
    include_derived_vectors: Annotated[bool | None, Query(description="Include derived vectors")] = None,
) -> list[schemas.VectorDescription]:
    """Get list of all vectors in a given Sumo ensemble, excluding any historical vectors

    Optionally include derived vectors.
    """

    perf_metrics = ResponsePerfMetrics(response)

    access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    perf_metrics.record_lap("get-access")

    vector_info_arr = await access.get_available_vectors_async()
    perf_metrics.record_lap("get-available-vectors")

    ret_arr: list[schemas.VectorDescription] = []
    vector_names: list[str] = []
    for vi in vector_info_arr:
        vector_names.append(vi.name)
        ret_arr.append(
            schemas.VectorDescription(name=vi.name, descriptiveName=vi.name, hasHistorical=vi.has_historical)
        )

    perf_metrics.record_lap("convert-data")

    # Create derived vectors if requested
    if include_derived_vectors:
        total_vectors = {vector for vector in vector_names if is_total_vector(vector)}
        ret_arr.extend(_create_vector_descriptions_for_derived_vectors(total_vectors))

    LOGGER.info(f"Got vector list in: {perf_metrics.to_string()}")
    return ret_arr


@router.get("/delta_ensemble_vector_list/")
async def get_delta_ensemble_vector_list(
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    comparison_case_uuid: Annotated[str, Query(description="Sumo case uuid for comparison ensemble")],
    comparison_ensemble_name: Annotated[str, Query(description="Comparison ensemble name")],
    reference_case_uuid: Annotated[str, Query(description="Sumo case uuid for reference ensemble")],
    reference_ensemble_name: Annotated[str, Query(description="Reference ensemble name")],
    include_derived_vectors: Annotated[bool | None, Query(description="Include derived vectors")] = None,
) -> list[schemas.VectorDescription]:
    """Get list of all vectors for a delta ensemble based on all vectors in a given Sumo ensemble, excluding any historical vectors

    Definition:

        delta_ensemble = comparison_ensemble - reference_ensemble
    """

    perf_metrics = ResponsePerfMetrics(response)

    comparison_ensemble_access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_case_uuid_and_ensemble_name(
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
        schemas.VectorDescription(name=vi, descriptiveName=vi, hasHistorical=False) for vi in vector_names
    ]

    perf_metrics.record_lap("convert-data-to-schema")

    # Create derived vectors if requested
    if include_derived_vectors:
        total_vectors = {vector for vector in vector_names if is_total_vector(vector)}
        ret_arr.extend(_create_vector_descriptions_for_derived_vectors(total_vectors))

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

    access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")

    is_vector_derived = is_derived_vector(vector_name)
    vector_name_to_fetch = vector_name if not is_vector_derived else get_total_vector_name(vector_name)

    ret_arr: list[schemas.VectorRealizationData] = []
    if not is_vector_derived:
        sumo_vec_arr = await access.get_vector_async(
            vector_name=vector_name_to_fetch,
            resampling_frequency=sumo_freq,
            realizations=realizations,
        )
        perf_metrics.record_lap("get-vector")

        ret_arr = converters.realization_vector_list_to_api_vector_realization_data_list(sumo_vec_arr)
    else:
        # Handle derived vectors
        vector_table_pa, vector_metadata = await access.get_vector_table_async(
            vector_name=vector_name_to_fetch,
            resampling_frequency=sumo_freq,
            realizations=realizations,
        )

        derived_vector_type = get_derived_vector_type(vector_name)
        derived_vector_unit = create_derived_vector_unit(vector_metadata.unit, derived_vector_type)
        derived_vector_info = converters.to_api_derived_vector_info(derived_vector_type, vector_name_to_fetch)

        derived_vector_table_pa = create_derived_vector_table_for_type(vector_table_pa, derived_vector_type)
        derived_realization_vector_list = create_derived_realization_vector_list(
            derived_vector_table_pa, vector_name, vector_metadata.is_rate, derived_vector_unit
        )

        ret_arr = converters.derived_vector_realizations_to_api_vector_realization_data_list(
            derived_realization_vector_list, derived_vector_info
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

    is_vector_derived = is_derived_vector(vector_name)
    vector_name_to_fetch = vector_name if not is_vector_derived else get_total_vector_name(vector_name)

    # Create delta ensemble table and metadata:
    (
        delta_vector_table_pa,
        delta_vector_metadata,
    ) = await _get_vector_tables_and_create_delta_vector_table_and_metadata_async(
        authenticated_user,
        comparison_case_uuid,
        comparison_ensemble_name,
        reference_case_uuid,
        reference_ensemble_name,
        vector_name_to_fetch,
        realizations,
        service_freq,
        perf_metrics,
    )

    # Create realization delta vectors
    ret_arr: list[schemas.VectorRealizationData] = []
    if not is_vector_derived:
        realization_delta_vector_list = create_realization_delta_vector_list(
            delta_vector_table_pa,
            vector_name_to_fetch,
            delta_vector_metadata.is_rate,
            delta_vector_metadata.unit,
        )
        perf_metrics.record_lap("create-realization-delta-vector-list")

        ret_arr = converters.realization_delta_vector_list_to_api_vector_realization_data_list(
            realization_delta_vector_list
        )
    else:
        derived_vector_type = get_derived_vector_type(vector_name)
        derived_vector_unit = create_derived_vector_unit(delta_vector_metadata.unit, derived_vector_type)
        derived_vector_info = converters.to_api_derived_vector_info(derived_vector_type, vector_name_to_fetch)

        # Create derived vectors if requested
        delta_derived_vector_table_pa = create_derived_vector_table_for_type(delta_vector_table_pa, derived_vector_type)
        realization_delta_vector_list = create_realization_delta_vector_list(
            delta_derived_vector_table_pa, vector_name, delta_vector_metadata.is_rate, derived_vector_unit
        )
        perf_metrics.record_lap("create-realization-delta-derived-vector-list")

        ret_arr = converters.realization_delta_vector_list_to_api_vector_realization_data_list(
            realization_delta_vector_list, derived_vector_info
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
    access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
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
    access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")
    sumo_hist_vec = await access.get_matching_historical_vector_async(
        non_historical_vector_name=non_historical_vector_name, resampling_frequency=sumo_freq
    )

    if not sumo_hist_vec:
        raise HTTPException(status_code=404, detail="Could not get historical vector")

    return schemas.VectorHistoricalData(
        timestampsUtcMs=sumo_hist_vec.timestamps_utc_ms,
        values=sumo_hist_vec.values,
        unit=sumo_hist_vec.metadata.unit,
        isRate=sumo_hist_vec.metadata.is_rate,
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

    access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )

    service_freq = Frequency.from_string_value(resampling_frequency.value)
    service_stat_funcs_to_compute = converters.to_service_statistic_functions(statistic_functions)

    is_vector_derived = is_derived_vector(vector_name)
    vector_name_to_fetch = vector_name if not is_vector_derived else get_total_vector_name(vector_name)

    # Get vector table
    vector_table, vector_metadata = await access.get_vector_table_async(
        vector_name=vector_name_to_fetch,
        resampling_frequency=service_freq,
        realizations=realizations,
    )
    perf_metrics.record_lap("get-table")

    # Calculate statistics
    ret_data: schemas.VectorStatisticData | None = None
    if not is_vector_derived:
        statistics = compute_vector_statistics(vector_table, vector_name, service_stat_funcs_to_compute)
        if not statistics:
            raise HTTPException(status_code=404, detail="Could not compute statistics")

        ret_data = converters.to_api_vector_statistic_data(statistics, vector_metadata.is_rate, vector_metadata.unit)
    else:
        derived_vector_type = get_derived_vector_type(vector_name)
        derived_vector_unit = create_derived_vector_unit(vector_metadata.unit, derived_vector_type)
        derived_vector_info = converters.to_api_derived_vector_info(derived_vector_type, vector_name_to_fetch)

        derived_vector_table_pa = create_derived_vector_table_for_type(vector_table, derived_vector_type)
        statistics = compute_vector_statistics(derived_vector_table_pa, vector_name, service_stat_funcs_to_compute)

        if not statistics:
            raise HTTPException(status_code=404, detail="Could not compute statistics")

        ret_data = converters.to_api_vector_statistic_data(
            statistics, vector_metadata.is_rate, derived_vector_unit, derived_vector_info
        )

    perf_metrics.record_lap("calc-stat")
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

    is_vector_derived = is_derived_vector(vector_name)
    vector_name_to_fetch = vector_name if not is_vector_derived else get_total_vector_name(vector_name)

    # Create delta ensemble table and metadata:
    (
        delta_vector_table_pa,
        delta_vector_metadata,
    ) = await _get_vector_tables_and_create_delta_vector_table_and_metadata_async(
        authenticated_user,
        comparison_case_uuid,
        comparison_ensemble_name,
        reference_case_uuid,
        reference_ensemble_name,
        vector_name_to_fetch,
        realizations,
        service_freq,
        perf_metrics,
    )

    # Calculate statistics
    ret_data: schemas.VectorStatisticData | None = None
    if not is_vector_derived:
        statistics = compute_vector_statistics(delta_vector_table_pa, vector_name, service_stat_funcs_to_compute)

        if not statistics:
            raise HTTPException(status_code=404, detail="Could not compute statistics")

        ret_data = converters.to_api_delta_ensemble_vector_statistic_data(
            statistics, delta_vector_metadata.is_rate, delta_vector_metadata.unit
        )
    else:
        derived_vector_type = get_derived_vector_type(vector_name)
        derived_vector_unit = create_derived_vector_unit(delta_vector_metadata.unit, derived_vector_type)
        derived_vector_info = converters.to_api_derived_vector_info(derived_vector_type, vector_name_to_fetch)

        delta_derived_vector_table_pa = create_derived_vector_table_for_type(delta_vector_table_pa, derived_vector_type)
        statistics = compute_vector_statistics(
            delta_derived_vector_table_pa, vector_name, service_stat_funcs_to_compute
        )

        if not statistics:
            raise HTTPException(status_code=404, detail="Could not compute statistics")

        ret_data = converters.to_api_delta_ensemble_vector_statistic_data(
            statistics, delta_vector_metadata.is_rate, derived_vector_unit, derived_vector_info
        )

    perf_metrics.record_lap("calc-delta-vector-stat")
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

    summmary_access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
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
                statistics, vector_metadata.is_rate, vector_metadata.unit, None
            )
            sensitivity_statistic_data = schemas.VectorStatisticSensitivityData(
                sensitivityName=sensitivity.name,
                sensitivityCase=case.name,
                realizations=statistic_data.realizations,
                timestampsUtcMs=statistic_data.timestampsUtcMs,
                valueObjects=statistic_data.valueObjects,
                unit=statistic_data.unit,
                isRate=statistic_data.isRate,
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
    summary_access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    ensemble_response = await summary_access.get_vector_values_at_timestamp_async(
        vector_name=vector_name, timestamp_utc_ms=timestamp_utc_ms, realizations=None
    )
    return ensemble_response


def _create_vector_descriptions_for_derived_vectors(
    vector_names: list[str] | set[str],
) -> list[schemas.VectorDescription]:
    """
    Create vector descriptions for derived vectors from list of vector names
    """
    ret_arr: list[schemas.VectorDescription] = []
    for vector_name in vector_names:
        if not is_total_vector(vector_name):
            continue

        per_day_vector_name = create_per_day_vector_name(vector_name)
        per_interval_vector_name = create_per_interval_vector_name(vector_name)
        ret_arr.extend(
            [
                schemas.VectorDescription(
                    name=per_day_vector_name,
                    descriptiveName=per_day_vector_name,
                    hasHistorical=False,
                    derivedVectorInfo=schemas.DerivedVectorInfo(
                        type=schemas.DerivedVectorType.PER_DAY, sourceVector=vector_name
                    ),
                ),
                schemas.VectorDescription(
                    name=per_interval_vector_name,
                    descriptiveName=per_interval_vector_name,
                    hasHistorical=False,
                    derivedVectorInfo=schemas.DerivedVectorInfo(
                        type=schemas.DerivedVectorType.PER_INTVL, sourceVector=vector_name
                    ),
                ),
            ]
        )
    return ret_arr


async def _get_vector_tables_and_create_delta_vector_table_and_metadata_async(
    authenticated_user: AuthenticatedUser,
    comparison_case_uuid: str,
    comparison_ensemble_name: str,
    reference_case_uuid: str,
    reference_ensemble_name: str,
    vector_name: str,
    realizations: list[int] | None,
    resampling_frequency: Frequency,
    perf_metrics: ResponsePerfMetrics | None,
) -> tuple[pa.Table, DeltaVectorMetadata]:
    """
    Get vector tables for comparison and reference ensembles and create delta ensemble vector table and metadata
    """
    # Separate summary access to comparison and reference ensemble
    comparison_ensemble_access = SummaryAccess.from_case_uuid_and_ensemble_name(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_case_uuid_and_ensemble_name(
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
            resampling_frequency=resampling_frequency,
            realizations=realizations,
        ),
        reference_ensemble_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=resampling_frequency,
            realizations=realizations,
        ),
    )

    if perf_metrics:
        perf_metrics.record_lap("get-vector-tables-to-create-delta-vector-table")

    # Check for mismatching metadata
    if comparison_metadata.is_rate != reference_metadata.is_rate:
        raise HTTPException(
            status_code=400, detail="Rate mismatch between ensembles for delta ensemble statistical vector data"
        )
    if comparison_metadata.unit != reference_metadata.unit:
        raise HTTPException(
            status_code=400, detail="Unit mismatch between ensembles for delta ensemble statistical vector data"
        )

    delta_vector_metadata = DeltaVectorMetadata(unit=reference_metadata.unit, is_rate=reference_metadata.is_rate)

    # Create delta ensemble table
    delta_vector_table_pa = create_delta_vector_table(
        comparison_vector_table_pa, reference_vector_table_pa, vector_name
    )

    if perf_metrics:
        perf_metrics.record_lap("create-delta-vector-table")

    return delta_vector_table_pa, delta_vector_metadata
