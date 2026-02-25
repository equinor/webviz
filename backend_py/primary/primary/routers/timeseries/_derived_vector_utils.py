import pyarrow as pa
from fastapi import HTTPException

from webviz_services.sumo_access.summary_types import VectorMetadata
from webviz_services.utils.statistic_function import StatisticFunction
from webviz_services.summary_derived_vectors import (
    create_per_day_vector_name,
    create_per_interval_vector_name,
    create_derived_realization_vector_list,
    create_derived_vector_table_and_metadata_and_info,
    is_total_vector,
)
from webviz_services.summary_vector_statistics import compute_vector_statistics
from webviz_services.summary_delta_vectors import (
    DeltaVectorMetadata,
)

from . import schemas, converters


def create_derived_vector_realization_data_list(
    derived_vector_name: str,
    source_vector_table_pa: pa.Table,
    source_vector_metadata: VectorMetadata | DeltaVectorMetadata,
) -> list[schemas.VectorRealizationData]:
    """Create vector realization data for derived vector on API format"""
    derived_vector_table_pa, derived_vector_metadata, derived_vector_info = (
        create_derived_vector_table_and_metadata_and_info(
            derived_vector_name, source_vector_table_pa, source_vector_metadata
        )
    )
    derived_realization_vector_list = create_derived_realization_vector_list(
        derived_vector_table_pa, derived_vector_name, source_vector_metadata.is_rate, derived_vector_metadata.unit
    )

    return converters.derived_realization_vector_list_and_info_to_api_vector_realization_data_list(
        derived_realization_vector_list, derived_vector_info
    )


def create_derived_statistics_vector_data(
    derived_vector_name: str,
    source_vector_table_pa: pa.Table,
    source_vector_metadata: VectorMetadata | DeltaVectorMetadata,
    statistics_to_compute: list[StatisticFunction] | None,
) -> schemas.VectorStatisticData:
    """Create vector statistics data for derived vector on API format"""
    derived_vector_table_pa, derived_vector_metadata, derived_vector_info = (
        create_derived_vector_table_and_metadata_and_info(
            derived_vector_name, source_vector_table_pa, source_vector_metadata
        )
    )
    derived_vector_statistics = compute_vector_statistics(
        derived_vector_table_pa, derived_vector_name, statistics_to_compute
    )

    if not derived_vector_statistics:
        raise HTTPException(status_code=404, detail="Could not compute statistics")

    return converters.derived_vector_statistics_data_to_api_vector_statistic_data(
        derived_vector_statistics, derived_vector_metadata, derived_vector_info
    )


def create_vector_descriptions_for_derived_vectors(
    vector_names: list[str] | set[str],
) -> list[schemas.VectorDescription]:
    """
    Create vector descriptions for derived vectors from list of vector names on API format
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
