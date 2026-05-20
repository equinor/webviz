import asyncio
import logging
from typing import Annotated

import pyarrow as pa
import pyarrow.compute as pc
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from webviz_services.summary_vector_statistics import compute_vector_statistics
from webviz_services.sumo_access.parameter_access import ParameterAccess
from webviz_services.sumo_access.summary_access import Frequency, SummaryAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.summary_delta_vectors import (
    DeltaVectorMetadata,
    create_delta_vector_table,
    create_realization_delta_vector_list,
)
from webviz_services.summary_derived_vectors import (
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

from primary.auth.auth_helper import AuthHelper
from primary.middleware.cache_control_middleware import cache_time, CacheTime
from primary.utils.response_perf_metrics import ResponsePerfMetrics
from primary.utils.query_string_utils import decode_uint_list_str


from . import converters, schemas

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vector_list/")
@cache_time(CacheTime.LONG)
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
        ret_arr.extend(_create_vector_descriptions_for_derived_vectors(total_vectors))

    LOGGER.info(f"Got vector list in: {perf_metrics.to_string()}")
    return ret_arr


@router.get("/delta_ensemble_vector_list/")
@cache_time(CacheTime.LONG)
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
        ret_arr.extend(_create_vector_descriptions_for_derived_vectors(total_vectors))

    LOGGER.info(f"Got delta ensemble vector list in: {perf_metrics.to_string()}")
    return ret_arr


@router.get("/realizations_vector_data/")
@cache_time(CacheTime.LONG)
# pylint: disable-next=too-many-locals
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
@cache_time(CacheTime.LONG)
# pylint: disable-next=too-many-locals
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


@router.get("/historical_vector_data/")
@cache_time(CacheTime.LONG)
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
@cache_time(CacheTime.LONG)
# pylint: disable-next=too-many-locals
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
@cache_time(CacheTime.LONG)
# pylint: disable=too-many-arguments
# pylint: disable-next=too-many-locals
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
@cache_time(CacheTime.LONG)
# pylint: disable-next=too-many-locals
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
    comparison_ensemble_access = SummaryAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_ensemble_name(
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




from hashlib import sha256
import time
import json
from dataclasses import dataclass
import httpx
from pydantic import BaseModel
from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from webviz_services.utils.task_meta_tracker import get_task_meta_tracker_for_user
from webviz_services.utils.task_meta_tracker import TaskMeta, TaskMetaTracker
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client
from .._shared.long_running_operations import LroInProgressResp, LroFailureResp, LroSuccessResp, LroErrorInfo
from primary.utils.user_cache import UserCache, get_user_cache_for_user
from fmu.sumo.explorer.objects import Table



class DerivedTableResponse(BaseModel):
    table_handle: str
    dbg_info: str | None

class DerivedTableInfo(BaseModel):
    vector_names: list[str]


@router.get("/derived_vector_table/hybrid")
async def get_derived_vector_table_hybrid(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    # fmt:on
) -> LroSuccessResp[DerivedTableResponse] | LroInProgressResp | LroFailureResp:

    perf_metrics = ResponsePerfMetrics(response)

    vector_names = ["WBHP:A1","RGIP:1", "RGIPG:1", "RGIPL:1", "RGPR:1", "RGPT:1", "GGPR:OP"]

    LOGGER.info(f"!!!!!!!!!!Received request for derived vector table with: {case_uuid=} {ensemble_name=} {vector_names=}")

    task_fp = await _determine_task_fingerprint_async(authenticated_user, case_uuid, ensemble_name, vector_names)
    perf_metrics.record_lap("fingerprint")

    table_handle = f"derived_vector_table_handle__{task_fp}"

    user_cache: UserCache = get_user_cache_for_user(authenticated_user)
    table_info: DerivedTableInfo | None = await user_cache.get_pydantic_model_async(table_handle, DerivedTableInfo, "json")
    perf_metrics.record_lap("get-from-cache")
    # if table_info:
    #     # Should we do further verification here
    #     LOGGER.info(f"!!!!!!!!!!Got existing table info: {table_info=}")
    #     return LroSuccessResp(status="success", result=DerivedTableResponse(table_handle=table_handle, dbg_info="Got from cache"))


    task_tracker = get_task_meta_tracker_for_user(authenticated_user)
    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    perf_metrics.record_lap("task-meta")
    task_meta = None

    access_token = authenticated_user.get_sumo_access_token()
    sumo_client = create_sumo_client(access_token)

    new_sumo_task_was_submitted = False
    if not task_meta:
        # Here we should determine the list of vectors that need to be batch aggregated
        # If this list comes up empty, there is no need for submitting a task to Sumo, and we can just:
        #  * Write DerivedTableInfo to the user cache
        #  * Return success with the table handle

        await _find_columns_needing_aggregation_async(sumo_client, case_uuid, ensemble_name, vector_names)

        # But until then, let's just start the batch
        task_meta = await _submit_and_track_task_async(sumo_client, case_uuid, ensemble_name, vector_names, task_tracker, task_fp)
        new_sumo_task_was_submitted = True
        LOGGER.info(f"!!!!!!!!!!Submitted new task for: {case_uuid=} {ensemble_name=}, {task_meta=}")
        perf_metrics.record_lap("submit")



    try:
        # poll_count = 0
        # while True:
        #     res = await _poll_task_async(sumo_client=sumo_client, sumo_task_id=task_meta.task_id)
        #     poll_count += 1
        #     perf_metrics.record_lap("poll")
        #     LOGGER.info(f"!!!!!!!!!!POLL RESULT({poll_count}) {res=} in {perf_metrics.to_string()}")

        #     # if res.result_map:
        #     #     sc = SearchContext(sumo=sumo_client)
        #     #     for key, value in res.result_map.items():
        #     #         obj = await sc.get_object_async(value)
        #     #         LOGGER.info(f"!!!!!!!!!!GOT OBJECT FOR KEY {key}: {obj=}")
        #     #         LOGGER.info("---")
        #     #         LOGGER.info(json.dumps(obj.metadata, indent=2))

        #     if res.status == "succeeded" or res.status == "failed":
        #         break

        #     await asyncio.sleep(0.2)

        res = await _poll_task_async(sumo_client=sumo_client, sumo_task_id=task_meta.task_id)
        LOGGER.info(f"!!!!!!!!!!POLL RESULT {res=} in {perf_metrics.to_string()}")

        perf_metrics.record_lap("poll")

        if res.status == "failed":
            await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
            return LroFailureResp(status="failure", error=LroErrorInfo(message="Something went wrong"))

        if res.status == "succeeded":
            await user_cache.put_pydantic_model_async(table_handle, DerivedTableInfo(vector_names=vector_names), "json", 10)
            return LroSuccessResp(status="success", result=DerivedTableResponse(table_handle=table_handle, dbg_info="Completed task and stored result in cache"))

        elapsed_task_time_s = time.time() - task_meta.start_time_utc_s
        if new_sumo_task_was_submitted:
            prog_msg = f"New task submitted: {res.status}"
        else:
            prog_msg = f"Sumo task status: {res.status} ({elapsed_task_time_s:.1f}s elapsed)"
        return LroInProgressResp(status="in_progress", task_id=task_meta.task_id, progress_message=prog_msg)

    except Exception as _exc:
        # Must delete the fingerprint mapping so that the next call to this endpoint starts fresh.
        # Then just re-raise the exception and let our middleware handle it
        await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
        raise


    # try:
    #     res = await _poll_task_async(sumo_client=sumo_client, sumo_task_id=task_meta.task_id)
    #     perf_metrics.record_lap("poll")

    #     LOGGER.info(f"!!!!!!!!!!POLL RESULT {res=} in {perf_metrics.to_string()}")

    #     return LroSuccessResp(status="success", result="YES")

    # except Exception as _exc:
    #     # Must delete the fingerprint mapping so that the next call to this endpoint starts fresh.
    #     # Then just re-raise the exception and let our middleware handle it
    #     await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
    #     raise




async def _determine_task_fingerprint_async(authenticated_user: AuthenticatedUser, case_uuid: str, ensemble_name: str, vector_names: list[str]) -> str:
    fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)

    ensemble_fp = await fingerprinter.get_or_calc_ensemble_fp_async(case_uuid, ensemble_name)
    sorted_vector_names_str = ",".join(sorted(vector_names))
    task_payload_str = f"{case_uuid}:{ensemble_name}:{sorted_vector_names_str}"
    task_fp = sha256((ensemble_fp + task_payload_str).encode()).hexdigest()

    return task_fp



async def _is_column_agg_valid(column_name: str, sc_base: SearchContext) -> bool:
    sc_agg_table = sc_base.filter(column=column_name, aggregation="collection", realization=False)

    num_agg_tables = await sc_agg_table.length_async()
    if num_agg_tables != 1:
        return False

    agg_table_obj: Table = await sc_agg_table.getitem_async(0)
    agg_ts = agg_table_obj.metadata["_sumo"]["timestamp"]

    sc_real_tables = sc_base.filter(realization=True, aggregation=False)
    sc_real_tables_older_than_agg = sc_real_tables.filter(complex={"range": {"_sumo.timestamp": {"lt": agg_ts}}})

    # Get the realization ids for the tables that are older than the aggregation
    real_ids_older_than_agg = await sc_real_tables_older_than_agg.realizationids_async

    # Get the current realization count
    current_real_count = await sc_real_tables.filter().length_async()

    # If there are any new realizations the aggregation is invalid
    if current_real_count != len(real_ids_older_than_agg):
        return False

    # Compare the set of realization ids that are older than the aggregation with the realization
    # ids that were actually used to construct the aggregation.
    if set(real_ids_older_than_agg) != set(agg_table_obj.metadata["fmu"]["aggregation"]["realization_ids"]):
        return False

    return True



async def _find_columns_needing_aggregation_async(sumo_client: SumoClient, case_uuid: str, ensemble_name: str, column_names: list[str]) -> list[str]:
    if not column_names:
        return []

    sc_base = SearchContext(sumo=sumo_client).tables.filter(
        uuid=case_uuid,
        ensemble=ensemble_name,
        content=["timeseries", "simulationtimeseries"]
    )

    unique_column_names = list(dict.fromkeys(column_names))

    # Even if we specify the column names we're interested in here, we end up getting columns such as DATE and REAL back here
    sc_already_agg = sc_base.filter(column=unique_column_names, aggregation="collection", realization=False)
    raw_agg_cols_in_sumo: set[str] = set(await sc_already_agg.columns_async)

    validation_tasks: dict[str, asyncio.Task] = {}
    async with asyncio.TaskGroup() as tg:
        for col_name in unique_column_names:
            if col_name in raw_agg_cols_in_sumo:
                validation_tasks[col_name] = tg.create_task(_is_column_agg_valid(col_name, sc_base))

    cols_with_valid_agg: set[str] = set()
    for col_name, task in validation_tasks.items():
        if task.result():
            cols_with_valid_agg.add(col_name)

    cols_needing_agg: list[str] = []
    for col_name in unique_column_names:
        if col_name not in cols_with_valid_agg:
            cols_needing_agg.append(col_name)

    LOGGER.info(f"!!!!!!!!!!Requested columns:     {set(column_names)}")
    LOGGER.info(f"!!!!!!!!!!Existing aggregations: {cols_with_valid_agg}")
    LOGGER.info(f"!!!!!!!!!!Needing aggregation:   {cols_needing_agg}")

    return cols_needing_agg


def _should_treat_httpx_exception_as_timeout(httpx_exception: httpx.HTTPError) -> bool:
    """
    Return True if the given httpx exception should be treated as an upstream timeout.

    Covers:
      * client-side timeouts: httpx.ConnectTimeout, httpx.ReadTimeout
      * server-side timeout response: httpx.HTTPStatusError with status 504 Gateway Timeout

    Note that for server-side timeouts to work, httpx.raise_for_status() must have been called on the response.
    """
    if isinstance(httpx_exception, (httpx.ConnectTimeout, httpx.ReadTimeout)):
        return True

    if isinstance(httpx_exception, httpx.HTTPStatusError) and httpx_exception.response is not None:
        return httpx_exception.response.status_code == 504

    return False


async def _submit_and_track_task_async(
    sumo_client: SumoClient, case_uuid: str, ensemble_name: str, vector_names: list[str], task_tracker: TaskMetaTracker, task_fp: str
) -> TaskMeta:
    task_start_time_utc_s = time.time()

    sc_base = SearchContext(sumo=sumo_client).tables.filter(
            uuid=case_uuid,
            ensemble=ensemble_name,
            content=["timeseries", "simulationtimeseries"],
        )
    sc_real = sc_base.filter(realization=True, aggregation=False)

    try:
        httpx_resp = await sc_real.batch_aggregate_async(columns=vector_names, operation="collection", no_wait=True)
    except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.HTTPStatusError) as exc:
        if _should_treat_httpx_exception_as_timeout(exc):
            raise HTTPException(status_code=404, detail="Submitting task to Sumo aggregation service timed out") from exc
        raise HTTPException(status_code=404, detail="Error starting Sumo aggregation task") from exc

    LOGGER.info(f"!!!!!!!!!!Submitted Sumo task, got http response: {httpx_resp=} {type(httpx_resp)=}")

    # When we call aggregate_async() with no_wait=True, we expect the raw httpx.Response object
    # from the underlying POST request to be returned.
    if not isinstance(httpx_resp, httpx.Response):
        raise TypeError("Unexpected response type from Sumo when submitting statistical surface job")

    # We're not getting a task id back from the POST, but a location header with a URL to poll for the result.
    # Do a bit of string manipulation to extract the actual task UUID from the location header
    # The full pull location typically looks something like this:
    #   https://main-sumo-prod.radix.equinor.com/api/v1/tasks('3de7a932-14de-4873-8389-fe3a83213638')/result
    full_poll_location = httpx_resp.headers.get("location")
    start = full_poll_location.find("/tasks('") + 8
    end = full_poll_location.find("')/result", start)
    sumo_task_uuid = full_poll_location[start:end]

    # According to Sumo team, the tasks and task results will be purged after 24 hours, so we set our TTL slightly shorter at 23 hours
    task_ttl_s = 23 * 60 * 60
    task_meta = await task_tracker.register_task_with_fingerprint_async(
        task_system="sumo_task",
        task_id=sumo_task_uuid,
        fingerprint=task_fp,
        ttl_s=task_ttl_s,
        task_start_time_utc_s=task_start_time_utc_s,
        expected_store_key=None,
    )

    return task_meta


@dataclass(frozen=True)
class _SumoTaskState:
    status: str  # The main status of the Sumo task. Observed values: running, succeeded, failed
    result_url: str | None  # The URL to the result of the task, if available
    result_map: dict | None = None


async def _poll_task_async(sumo_client: SumoClient, sumo_task_id: str) -> _SumoTaskState:
    # The poll path (which sumo client adds to its base_url) is: /tasks('{taskUuid}')/result
    # Initially we used a poll_path on the form: /tasks('{taskUuid}')/result
    # After slack discussions with R. Wiker, we now try and use the more generic path without /result to try and get richer status information
    poll_path = f"/tasks('{sumo_task_id}')"
    poll_resp = await sumo_client.get_async(poll_path)
    poll_resp_dict = poll_resp.json()

    LOGGER.debug("-----")
    LOGGER.debug(f"{poll_resp_dict=}")
    #LOGGER.debug(json.dumps(poll_resp_dict, indent=2))

    source_dict = poll_resp_dict.get("_source", {})
    LOGGER.debug(f"_source.result_map: {source_dict.get('result_map')}")

    # source_dict = poll_resp_dict.get("_source", {})
    # job_list = source_dict.get("parameters", {}).get("jobStatuses", [])
    # first_job_dict = job_list[0] if job_list else {}
    # LOGGER.debug(f"Poll response status: {poll_resp.status_code=}")
    # LOGGER.debug(f"Poll response:\n--\n{json.dumps(poll_resp.json(), indent=2)}\n--")
    # LOGGER.debug(f"_source.start: {source_dict.get('start')}")
    # LOGGER.debug(f"_source.end: {source_dict.get('end')}")
    # LOGGER.debug(f"_source.status: {source_dict.get('status')}")
    # LOGGER.debug(f"_source.parameters.entity: {source_dict.get('parameters', {}).get('entity')}")
    # LOGGER.debug(f"_source.parameters.jobStatuses[0].status: {first_job_dict.get('status')}")
    # LOGGER.debug(f"_source.result_url: {source_dict.get('result_url')}")
    LOGGER.debug("-----")

    status = poll_resp_dict["_source"]["status"]
    result_url = poll_resp_dict["_source"].get("result_url")
    return _SumoTaskState(
        status=status,
        result_url=result_url,
        result_map=poll_resp_dict["_source"].get("result_map"),
    )
