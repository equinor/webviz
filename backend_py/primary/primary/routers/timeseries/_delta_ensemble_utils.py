import asyncio

import pyarrow as pa
from fastapi import HTTPException

from webviz_services.sumo_access.summary_access import Frequency, SummaryAccess
from webviz_services.utils.authenticated_user import AuthenticatedUser
from webviz_services.summary_delta_vectors import (
    create_delta_vector_table,
    DeltaVectorMetadata,
)
from primary.utils.response_perf_metrics import ResponsePerfMetrics


async def get_vector_tables_and_create_delta_vector_table_and_metadata_async(
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
    Get vector tables for comparison and reference ensembles and create delta ensemble vector pa.Table
    and metadata
    """
    # Separate summary access to comparison and reference ensemble
    comparison_ensemble_access = SummaryAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), comparison_case_uuid, comparison_ensemble_name
    )
    reference_ensemble_access = SummaryAccess.from_ensemble_name(
        authenticated_user.get_sumo_access_token(), reference_case_uuid, reference_ensemble_name
    )

    # Get tables parallel
    # - Resampled data is assumed to be such that dates/timestamps are comparable between ensembles
    #   and cases, i.e. timestamps for a resampling of a daily vector in both ensembles should be
    #   the same.
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

    # Create metadata from reference vector
    delta_vector_metadata = DeltaVectorMetadata(
        name=reference_metadata.name, unit=reference_metadata.unit, is_rate=reference_metadata.is_rate
    )

    # Create delta ensemble table
    delta_vector_table_pa = create_delta_vector_table(
        comparison_vector_table_pa, reference_vector_table_pa, vector_name
    )

    if perf_metrics:
        perf_metrics.record_lap("create-delta-vector-table")

    return delta_vector_table_pa, delta_vector_metadata
