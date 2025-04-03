from typing import Sequence

from primary.services.summary_vector_statistics import VectorStatistics
from primary.services.sumo_access.summary_access import RealizationVector
from primary.services.utils.statistic_function import StatisticFunction
from primary.services.summary_delta_vectors import RealizationDeltaVector
from primary.services.summary_derived_vectors import DerivedVectorType, DerivedRealizationVector
from . import schemas


def to_api_derived_vector_type(derived_type: DerivedVectorType) -> schemas.DerivedVectorType:
    """
    Create API DerivedVectorType from service layer DerivedVectorType
    """
    return schemas.DerivedVectorType(derived_type.value)


def to_api_derived_vector_info(derived_type: DerivedVectorType, source_vector: str) -> schemas.DerivedVectorInfo:
    """
    Create API DerivedVectorInfo from service layer DerivedVectorInfo
    """
    return schemas.DerivedVectorInfo(
        type=to_api_derived_vector_type(derived_type),
        sourceVector=source_vector,
    )


def realization_vector_list_to_api_vector_realization_data_list(
    realization_vector_list: list[RealizationVector],
) -> list[schemas.VectorRealizationData]:
    """
    Create API VectorRealizationData list from service layer RealizationVector list
    """
    return [
        schemas.VectorRealizationData(
            realization=real_vec.realization,
            timestampsUtcMs=real_vec.timestamps_utc_ms,
            values=real_vec.values,
            unit=real_vec.metadata.unit,
            isRate=real_vec.metadata.is_rate,
        )
        for real_vec in realization_vector_list
    ]


def derived_vector_realizations_to_api_vector_realization_data_list(
    derived_realization_vector_list: list[DerivedRealizationVector], derived_vector_info: schemas.DerivedVectorInfo
) -> list[schemas.VectorRealizationData]:
    """
    Create API VectorRealizationData list from service layer DerivedRealizationVector list and derived vector info
    """
    return [
        schemas.VectorRealizationData(
            realization=real_vec.realization,
            timestampsUtcMs=real_vec.timestamps_utc_ms,
            values=real_vec.values,
            unit=real_vec.unit,
            isRate=real_vec.is_rate,
            derivedVectorInfo=derived_vector_info,
        )
        for real_vec in derived_realization_vector_list
    ]


def realization_delta_vector_list_to_api_vector_realization_data_list(
    realization_delta_vector_list: list[RealizationDeltaVector],
    derived_vector_info: schemas.DerivedVectorInfo | None = None,
) -> list[schemas.VectorRealizationData]:
    """
    Create API VectorRealizationData list from service layer RealizationVector list

    Optional derived_vector_info is included in the API VectorRealizationData if provided
    """
    return [
        schemas.VectorRealizationData(
            realization=real_vec.realization,
            timestampsUtcMs=real_vec.timestamps_utc_ms,
            values=real_vec.values,
            unit=real_vec.unit,
            isRate=real_vec.is_rate,
            derivedVectorInfo=derived_vector_info,
        )
        for real_vec in realization_delta_vector_list
    ]


def to_service_statistic_functions(
    api_stat_funcs: Sequence[schemas.StatisticFunction] | None = None,
) -> list[StatisticFunction] | None:
    """
    Convert incoming list of API statistic function enum values to service layer StatisticFunction enums,
    also accounting for the case where the list is None
    """
    if api_stat_funcs is None:
        return None

    service_stat_funcs: list[StatisticFunction] = []
    for api_func_enum in api_stat_funcs:
        service_func_enum = StatisticFunction.from_string_value(api_func_enum.value)
        if service_func_enum:
            service_stat_funcs.append(service_func_enum)

    return service_stat_funcs


def to_api_vector_statistic_data(
    vector_statistics: VectorStatistics,
    is_rate: bool,
    unit: str,
    derived_vector_info: schemas.DerivedVectorInfo | None = None,
) -> schemas.VectorStatisticData:
    """
    Create API VectorStatisticData from service layer VectorStatistics
    """
    value_objects = _create_statistic_value_object_list(vector_statistics)
    ret_data = schemas.VectorStatisticData(
        realizations=vector_statistics.realizations,
        timestampsUtcMs=vector_statistics.timestamps_utc_ms,
        valueObjects=value_objects,
        unit=unit,
        isRate=is_rate,
        derivedVectorInfo=derived_vector_info,
    )

    return ret_data


def to_api_delta_ensemble_vector_statistic_data(
    vector_statistics: VectorStatistics,
    is_rate: bool,
    unit: str,
    derived_vector_info: schemas.DerivedVectorInfo | None = None,
) -> schemas.VectorStatisticData:
    """
    Create API VectorStatisticData from service layer VectorStatistics
    """
    value_objects = _create_statistic_value_object_list(vector_statistics)
    ret_data = schemas.VectorStatisticData(
        realizations=vector_statistics.realizations,
        timestampsUtcMs=vector_statistics.timestamps_utc_ms,
        valueObjects=value_objects,
        unit=unit,
        isRate=is_rate,
        derivedVectorInfo=derived_vector_info,
    )

    return ret_data


def _create_statistic_value_object_list(vector_statistics: VectorStatistics) -> list[schemas.StatisticValueObject]:
    """
    Create list of statistic value objects from vector statistics object
    """
    value_objects: list[schemas.StatisticValueObject] = []
    for api_func_enum in schemas.StatisticFunction:
        service_func_enum = StatisticFunction.from_string_value(api_func_enum.value)
        if service_func_enum is not None:
            value_arr = vector_statistics.values_dict.get(service_func_enum)
            if value_arr is not None:
                value_objects.append(schemas.StatisticValueObject(statisticFunction=api_func_enum, values=value_arr))

    return value_objects
