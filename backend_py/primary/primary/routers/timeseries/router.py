import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from webviz_services.summary_vector_statistics import compute_vector_statistics
from webviz_services.sumo_access.generic_types import EnsembleScalarResponse
from webviz_services.sumo_access.parameter_access import ParameterAccess
from webviz_services.sumo_access.summary_access import Frequency, SummaryAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.summary_delta_vectors import (
    create_realization_delta_vector_list,
)
from webviz_services.summary_derived_vectors import (
    get_total_vector_name,
    is_derived_vector,
    is_total_vector,
)

from primary.auth.auth_helper import AuthHelper
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.utils.query_string_utils import decode_uint_list_str

from . import _sensitivity_case_utils, converters, schemas, _derived_vector_utils, _delta_ensemble_utils


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

    access = SummaryAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
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
        ret_arr.extend(_derived_vector_utils.create_vector_descriptions_for_derived_vectors(total_vectors))

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

    comparison_ensemble_access = SummaryAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_ensemble_name(
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
        ret_arr.extend(_derived_vector_utils.create_vector_descriptions_for_derived_vectors(total_vectors))

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

    access = SummaryAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
    sumo_freq = Frequency.from_string_value(resampling_frequency.value if resampling_frequency else "dummy")

    if is_derived_vector(vector_name):
        source_vector_name = get_total_vector_name(vector_name)
        source_vector_table_pa, source_vector_metadata = await access.get_vector_table_async(
            vector_name=source_vector_name,
            resampling_frequency=resampling_frequency,
            realizations=realizations,
        )

        return _derived_vector_utils.create_derived_vector_realization_data_list(
            vector_name, source_vector_table_pa, source_vector_metadata
        )

    sumo_vec_arr = await access.get_vector_async(
        vector_name=vector_name,
        resampling_frequency=sumo_freq,
        realizations=realizations,
    )
    perf_metrics.record_lap("get-vector")
    LOGGER.info(f"Loaded realization summary data in: {perf_metrics.to_string()}")

    return converters.realization_vector_list_to_api_vector_realization_data_list(sumo_vec_arr)


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

    if is_derived_vector(vector_name):
        source_vector_name = get_total_vector_name(vector_name)

        # Create delta ensemble vector table and metadata for source vector:
        (
            source_delta_vector_table_pa,
            source_delta_vector_metadata,
        ) = await _delta_ensemble_utils.get_vector_tables_and_create_delta_vector_table_and_metadata_async(
            authenticated_user,
            comparison_case_uuid,
            comparison_ensemble_name,
            reference_case_uuid,
            reference_ensemble_name,
            source_vector_name,
            realizations,
            service_freq,
            perf_metrics,
        )

        # Create derived vector realization data and convert to API format:
        return _derived_vector_utils.create_derived_vector_realization_data_list(
            vector_name, source_delta_vector_table_pa, source_delta_vector_metadata
        )

    # Create delta ensemble table and metadata:
    (
        delta_vector_table_pa,
        delta_vector_metadata,
    ) = await _delta_ensemble_utils.get_vector_tables_and_create_delta_vector_table_and_metadata_async(
        authenticated_user,
        comparison_case_uuid,
        comparison_ensemble_name,
        reference_case_uuid,
        reference_ensemble_name,
        vector_name,
        realizations,
        service_freq,
        perf_metrics,
    )
    realization_delta_vector_list = create_realization_delta_vector_list(
        delta_vector_table_pa,
        vector_name,
        delta_vector_metadata.is_rate,
        delta_vector_metadata.unit,
    )
    perf_metrics.record_lap("create-realization-delta-vector-list")

    LOGGER.info(f"Loaded realization delta ensemble summary data in: {perf_metrics.to_string()}")
    return converters.realization_delta_vector_list_to_api_vector_realization_data_list(realization_delta_vector_list)


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
    access = SummaryAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)
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
    access = SummaryAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

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

    access = SummaryAccess.from_ensemble_name(authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name)

    service_freq = Frequency.from_string_value(resampling_frequency.value)
    service_stat_funcs_to_compute = converters.to_service_statistic_functions(statistic_functions)

    if is_derived_vector(vector_name):
        source_vector_name = get_total_vector_name(vector_name)
        source_vector_table_pa, source_vector_metadata = await access.get_vector_table_async(
            vector_name=source_vector_name,
            resampling_frequency=service_freq,
            realizations=realizations,
        )

        return _derived_vector_utils.create_derived_statistics_vector_data(
            vector_name, source_vector_table_pa, source_vector_metadata, service_stat_funcs_to_compute
        )

    # Get vector table
    vector_table_pa, vector_metadata = await access.get_vector_table_async(
        vector_name=vector_name,
        resampling_frequency=service_freq,
        realizations=realizations,
    )

    vector_statistics = compute_vector_statistics(vector_table_pa, vector_name, service_stat_funcs_to_compute)
    if not vector_statistics:
        raise HTTPException(status_code=404, detail="Could not compute statistics")

    perf_metrics.record_lap("calc-stat")
    LOGGER.info(f"Loaded and computed statistical summary data in: {perf_metrics.to_string()}")

    return converters.to_api_vector_statistic_data(vector_statistics, vector_metadata.is_rate, vector_metadata.unit)


@router.get("/delta_ensemble_statistical_vector_data/")
# pylint: disable=too-many-arguments
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

    if is_derived_vector(vector_name):
        source_vector_name = get_total_vector_name(vector_name)

        # Create delta ensemble table and metadata:
        (
            source_delta_vector_table_pa,
            source_delta_vector_metadata,
        ) = await _delta_ensemble_utils.get_vector_tables_and_create_delta_vector_table_and_metadata_async(
            authenticated_user,
            comparison_case_uuid,
            comparison_ensemble_name,
            reference_case_uuid,
            reference_ensemble_name,
            source_vector_name,
            realizations,
            service_freq,
            perf_metrics,
        )

        return _derived_vector_utils.create_derived_statistics_vector_data(
            vector_name,
            source_delta_vector_table_pa,
            source_delta_vector_metadata,
            service_stat_funcs_to_compute,
        )

    # Create delta ensemble table and metadata:
    (
        source_delta_vector_table_pa,
        source_delta_vector_metadata,
    ) = await _delta_ensemble_utils.get_vector_tables_and_create_delta_vector_table_and_metadata_async(
        authenticated_user,
        comparison_case_uuid,
        comparison_ensemble_name,
        reference_case_uuid,
        reference_ensemble_name,
        vector_name,
        realizations,
        service_freq,
        perf_metrics,
    )

    statistics = compute_vector_statistics(source_delta_vector_table_pa, vector_name, service_stat_funcs_to_compute)

    if not statistics:
        raise HTTPException(status_code=404, detail="Could not compute statistics")

    perf_metrics.record_lap("calc-delta-vector-stat")
    LOGGER.info(f"Loaded and computed statistical delta ensemble summary data in: {perf_metrics.to_string()}")

    return converters.to_api_vector_statistic_data(
        statistics, source_delta_vector_metadata.is_rate, source_delta_vector_metadata.unit
    )


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

    summmary_access = SummaryAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    parameter_access = ParameterAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    _, sensitivities = await parameter_access.get_parameters_and_sensitivities_async()

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
            vector_statistics = _sensitivity_case_utils.compute_sensitivity_case_vector_statistics(
                vector_table, vector_name, case.realizations, realizations, service_stat_funcs_to_compute
            )
            ret_data.append(
                converters.to_api_vector_statistic_sensitivity_data(
                    vector_statistics, vector_metadata.is_rate, vector_metadata.unit, sensitivity.name, case.name
                )
            )
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
    summary_access = SummaryAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), case_uuid, ensemble_name
    )
    ensemble_response = await summary_access.get_vector_values_at_timestamp_async(
        vector_name=vector_name, timestamp_utc_ms=timestamp_utc_ms, realizations=None
    )
    return ensemble_response
