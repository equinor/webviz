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



#################################################################################################################
#################################################################################################################
#################################################################################################################

import hashlib
import time

from fastapi import Request, status
import fsspec
import nanoid
import pyarrow as pa
import pyarrow.parquet as pq
from pydantic import BaseModel

from azure.servicebus import ServiceBusMessage
from cryptography.fernet import Fernet

from webviz_services.utils.task_meta_tracker import get_task_meta_tracker_for_user_id
from webviz_services.utils.task_meta_tracker import TaskState
from webviz_services.sumo_access.sumo_fingerprinter import get_sumo_fingerprinter_for_user
from webviz_services.sumo_access.sumo_client_factory import create_sumo_client
from webviz_services.derived_smry_table.create_and_store_job import bgjob_create_and_store_derived_table_async

from .._shared.long_running_operations import LroInProgressResp, LroFailureResp, LroSuccessResp, LroCommandResp

from primary import config
from primary.utils.message_bus import MessageBus, MessageBusSingleton
#from primary.utils.user_cache import UserCache, get_user_cache_for_user

from webviz_services.utils.sumo_blob_cache import SumoBlobCache
from webviz_core_utils.background_tasks import run_in_background_task

from webviz_server_schemas.pyworker.messages import CreateDerivedSmryTableMsg, WorkerOperation



class DerivedTableResponse(BaseModel):
    table_handle: str
    dbg_info: str | None

@router.get("/derived_vector_table_hybrid")
async def get_derived_vector_table_hybrid(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    case_uuid: Annotated[str, Query(description="Sumo case uuid")],
    ensemble_name: Annotated[str, Query(description="Ensemble name")],
    vector_names: Annotated[list[str], Query(description="List of vector names to include in the derived table")],
    retry_creation_task: Annotated[bool | None, Query(description="Can be used to retry the derived table creation task")] = None,
    # fmt:on
) -> LroSuccessResp[DerivedTableResponse] | LroInProgressResp | LroFailureResp | LroCommandResp:
    perf_metrics = ResponsePerfMetrics(response)
    dbg_prefix = "!!!!!!!!!! "
    LOGGER.debug(f"{dbg_prefix}Received request for derived vector table with: {case_uuid=} {ensemble_name=} {retry_creation_task=} {vector_names=}")

    # Create the deterministic table handle (also includes ensemble fingerprint)
    table_handle = await _compute_table_handle_async(authenticated_user, case_uuid, ensemble_name, vector_names)
    LOGGER.debug(f"{dbg_prefix}Table handle will be: {table_handle=}")

    user_id = authenticated_user.get_user_id()

    task_tracker = get_task_meta_tracker_for_user_id(user_id)
    task_fp = f"taskFP__{table_handle}"

    if retry_creation_task:
        LOGGER.info(f"{dbg_prefix}Retry creation task flag is set to true, trying to delete existing task with {task_fp=}")
        if await task_tracker.delete_task_by_fingerprint_async(task_fp):
            LOGGER.info(f"{dbg_prefix}Existing task was deleted {task_fp=}")
        else:
            LOGGER.info(f"{dbg_prefix}Tried to delete existing task, but no existing task found with {task_fp=}")

        return LroCommandResp(command_ok=True)

    sumo_access_token = authenticated_user.get_sumo_access_token()
    sumo_client = create_sumo_client(sumo_access_token)
    blob_cache = SumoBlobCache(sumo_client, SumoBlobCache.Namespace.DERIVED_VEC_TABLE)
    cache_key = blob_cache.compute_cache_key(table_handle)

    perf_metrics.record_lap("init")

    # Note that we always check in the cache first!
    # This means that once a table is created and is in cache, we will always return it and not trigger any
    # more tasks, even if the client keeps retrying with the retry_creation_task flag set to true. 
    # The retry_creation_task flag is really only for retrying when there is no cache entry yet.
    has_cache_entry = await blob_cache.has_cache_entry_async(cache_key)
    perf_metrics.record_lap("check-cache")
    if has_cache_entry:
        # Since the table is already in cache, we can delete any existing task mapping, since it is no longer needed.
        # If at some point in the future the table is pruned from the cache, we would like to create a new task anyway.
        await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)

        LOGGER.info(f"{dbg_prefix}Returning handle to derived table found in cache, timing: {perf_metrics.to_string()} [{table_handle=}, {cache_key=}]")
        return LroSuccessResp(result=DerivedTableResponse(table_handle=table_handle, dbg_info="Got from cache"))

    task_meta = await task_tracker.get_task_meta_by_fingerprint_async(task_fp)
    perf_metrics.record_lap("task-meta")

    new_task_was_submitted = False
    if not task_meta:
        fernet = Fernet(config.SERVICE_BUS_PAYLOAD_FERNET_KEY)
        encrypted_access_token = fernet.encrypt(sumo_access_token.encode())

        # !!!!!!!!!!!!!!!!!!!
        # !!!!!!!!!!!!!!!!!!!
        # !!!!!!!!!!!!!!!!!!!
        # Introduce error for testing purposes
        if "FGIR" in vector_names:
            encrypted_access_token = b"ILLEGAL VALUE FOR FGIR"

        task_id = nanoid.generate(size=12)

        msg = CreateDerivedSmryTableMsg(
            user_id=user_id,
            task_id=task_id,
            case_uuid=case_uuid,
            ensemble_name=ensemble_name,
            vector_names=vector_names,
            encrypted_access_token=encrypted_access_token,
        )

        task_meta = await task_tracker.register_task_with_fingerprint_async(
            task_id=task_id,
            fingerprint=task_fp,
            ttl_s=5 * 60,
            expected_store_key=cache_key)

        # job_coro = bgjob_create_and_store_derived_table_async(
        #     user_id=user_id,
        #     task_id=task_meta.task_id,
        #     sumo_access_token=sumo_access_token,
        #     case_uuid=case_uuid,
        #     ensemble_name=ensemble_name,
        #     vector_names=vector_names
        # )
        # run_in_background_task(job_coro)

        message_bus: MessageBus = MessageBusSingleton.get_instance()
        sb_msg = ServiceBusMessage(subject=WorkerOperation.CREATE_DERIVED_SMRY_TABLE, body=msg.model_dump_json())
        await message_bus.send_to_queue_async(queue_name="test-queue", message=sb_msg)

        new_task_was_submitted = True
        LOGGER.info(f"{dbg_prefix}Submitted new task to create derived table [{table_handle=}, {task_meta.task_id=}]")
        perf_metrics.record_lap("start-task")

    if task_meta.state == TaskState.SUCCEEDED:
        if not await blob_cache.has_cache_entry_async(cache_key):
            # This should not happen, if the task succeeded the blob should be in cache. But just in case, we can return an error here.
            await task_tracker.delete_fingerprint_to_task_mapping_async(task_fp)
            LOGGER.error(f"{dbg_prefix}Table creation task succeeded but could not find result in cache [{table_handle=}, {task_meta.task_id=}, {cache_key=}]")
            response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            return LroFailureResp(error_message="Task succeeded but could not find result in cache")

        LOGGER.info(f"{dbg_prefix}Table creation task succeeded, timing {perf_metrics.to_string()} [{table_handle=}, {task_meta.task_id=}]")
        return LroSuccessResp(result=DerivedTableResponse(table_handle=table_handle, dbg_info="Task succeeded"))

    if task_meta.state in [TaskState.FAILED, TaskState.CANCELLED]:
        LOGGER.error(f"{dbg_prefix}Table creation task failed, msg: {task_meta.status_message} [{table_handle=}, {task_meta.task_id=}]")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return LroFailureResp(error_message=f"Task {task_meta.state}, msg: {task_meta.status_message}")

    LOGGER.info(f"{dbg_prefix}Returning in-progress for table handle, timing: {perf_metrics.to_string()} [{table_handle=}, {task_meta.task_id=}]")

    if new_task_was_submitted:
        prog_msg = f"New task submitted: {task_meta.state}"
    else:
        status_text = f" - {task_meta.status_message}" if task_meta.status_message else ""
        elapsed_task_time_s = time.time() - task_meta.registered_at_utc_s
        prog_msg = f"Task {task_meta.state}{status_text} ({elapsed_task_time_s:.1f}s elapsed)"

    response.status_code = status.HTTP_202_ACCEPTED

    LOGGER.info(f"{dbg_prefix}Actual returning: {new_task_was_submitted=}, {retry_creation_task=}, timing: {perf_metrics.to_string()} [{table_handle=}, {task_meta.task_id=}]")

    return LroInProgressResp(status_str=task_meta.state, task_id=task_meta.task_id, progress_message=prog_msg)



class DerivedTableInfo(BaseModel):
    vector_names: list[str]
    row_count: int
    byte_size: int | None
    dbg_info: str | None

@router.get("/derived_table_info")
async def get_derived_table_info(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    table_handle: Annotated[str, Query(description="Handle for the derived table")],
    # fmt:on
) -> DerivedTableInfo:
    perf_metrics = ResponsePerfMetrics(response)
    dbg_prefix = "info!!!!!! "
    LOGGER.debug(f"{dbg_prefix}Received request for derived table info: {table_handle=}")

    sumo_access_token = authenticated_user.get_sumo_access_token()
    sumo_client = create_sumo_client(sumo_access_token)
    blob_cache = SumoBlobCache(sumo_client, SumoBlobCache.Namespace.DERIVED_VEC_TABLE)
    cache_key = blob_cache.compute_cache_key(table_handle)
    perf_metrics.record_lap("init")

    blob_sas_url = await blob_cache.resolve_cache_entry_async(cache_key)
    if not blob_sas_url:
        raise HTTPException(status_code=410, detail="Derived table not found in cache")
    perf_metrics.record_lap("resolve-cache")


    # !!!!!!!
    # !!!!!!!
    # Read only the Parquet footer via HTTP range requests — avoids downloading the full blob
    def _read_parquet_footer() -> tuple[list[str], int, int | None]:
        with fsspec.open(blob_sas_url, "rb") as f:
            pq_file = pq.ParquetFile(f)
            col_names: list[str] = pq_file.schema_arrow.names
            num_rows: int = pq_file.metadata.num_rows
            blob_size: int | None = getattr(f, "size", None)
        return col_names, num_rows, blob_size

    vector_names, row_count, blob_size_bytes = await asyncio.to_thread(_read_parquet_footer)
    perf_metrics.record_lap("read-footer")

    LOGGER.debug(f"{dbg_prefix}Vector names from footer: {vector_names}")



    table_blob_bytes = await blob_cache.download_resolved_blob_async(blob_sas_url)
    perf_metrics.record_lap("download-blob")
    if not table_blob_bytes:
        raise HTTPException(status_code=410, detail="Could not download derived table from blob storage")
    
    pq_table = pq.read_table(pa.BufferReader(table_blob_bytes))
    # LOGGER.debug(f"{dbg_prefix}Read table from blob cache, got schema:\n{pq_table.schema}")
    perf_metrics.record_lap("read-table")

    vector_names = pq_table.schema.names
    LOGGER.debug(f"{dbg_prefix}Vector names: {vector_names}")

    row_count = pq_table.num_rows
    blob_size_bytes = len(table_blob_bytes)
    LOGGER.debug(f"{dbg_prefix}Sizes: {row_count=}, {blob_size_bytes=}")

    LOGGER.info(f"{dbg_prefix}Got info on derived table, timing: {perf_metrics.to_string()} ({table_handle=})")
    return DerivedTableInfo(vector_names=vector_names, row_count=row_count, byte_size=blob_size_bytes, dbg_info=f"Timing: {perf_metrics.to_string()}")



@router.get("/calc_something_on_derived_table")
async def get_calc_something_on_derived_table(
    # fmt:off
    response: Response,
    authenticated_user: Annotated[AuthenticatedUser, Depends(AuthHelper.get_authenticated_user)],
    table_handle: Annotated[str, Query(description="Handle for the derived table to do some calculation on")],
    calculation_params: Annotated[str, Query(description="Some parameter for the calculation")],
    # fmt:on
) -> str:
    perf_metrics = ResponsePerfMetrics(response)

    sumo_access_token = authenticated_user.get_sumo_access_token()
    sumo_client = create_sumo_client(sumo_access_token)
    blob_cache = SumoBlobCache(sumo_client, SumoBlobCache.Namespace.DERIVED_VEC_TABLE)
    cache_key = blob_cache.compute_cache_key(table_handle)
    perf_metrics.record_lap("init")

    table_blob = await blob_cache.get_bytes_async(cache_key)
    perf_metrics.record_lap("get-from-cache")
    if not table_blob:
        raise HTTPException(status_code=410, detail="Derived table not found in cache")

    pq_table = pq.read_table(pa.BufferReader(table_blob))

    LOGGER.info(f"Did calculation on derived table blob from cache, timing: {perf_metrics.to_string()} ({table_handle=}, {calculation_params=})")

    return f"Did some calculation on derived table, timing: {perf_metrics.to_string()} ({table_handle=}, {calculation_params=})"



async def _compute_table_handle_async(authenticated_user: AuthenticatedUser, case_uuid: str, ensemble_name: str, vector_names: list[str]) -> str:
    sorted_vector_names_str = ",".join(sorted(vector_names))
    task_params_as_str = f"{case_uuid}:{ensemble_name}:{sorted_vector_names_str}_v3"

    sumo_fingerprinter = get_sumo_fingerprinter_for_user(authenticated_user=authenticated_user, cache_ttl_s=2 * 60)
    ensemble_fp = await sumo_fingerprinter.get_or_calc_ensemble_fp_async(case_uuid, ensemble_name)

    # 8 bytes = 16 hex chars = 64 bits should be enough to avoid collisions for our use case
    task_fp = hashlib.shake_128((ensemble_fp + task_params_as_str).encode()).hexdigest(8)
    return f"TH__{task_fp}"



