from typing import List, Optional, Sequence

from primary.services.summary_vector_statistics import VectorStatistics
from primary.services.sumo_access.summary_access import VectorMetadata
from primary.services.utils.statistic_function import StatisticFunction
from . import schemas


def to_service_statistic_functions(
    api_stat_funcs: Optional[Sequence[schemas.StatisticFunction]],
) -> Optional[List[StatisticFunction]]:
    """
    Convert incoming list of API statistic function enum values to service layer StatisticFunction enums,
    also accounting for the case where the list is None
    """
    if api_stat_funcs is None:
        return None

    service_stat_funcs: List[StatisticFunction] = []
    for api_func_enum in api_stat_funcs:
        service_func_enum = StatisticFunction.from_string_value(api_func_enum.value)
        if service_func_enum:
            service_stat_funcs.append(service_func_enum)

    return service_stat_funcs


def to_api_vector_statistic_data(
    vector_statistics: VectorStatistics, vector_metadata: VectorMetadata
) -> schemas.VectorStatisticData:
    """
    Create API VectorStatisticData from service layer VectorStatistics
    """
    value_objects = _create_statistic_value_object_list(vector_statistics)
    ret_data = schemas.VectorStatisticData(
        realizations=vector_statistics.realizations,
        timestamps_utc_ms=vector_statistics.timestamps_utc_ms,
        value_objects=value_objects,
        unit=vector_metadata.unit,
        is_rate=vector_metadata.is_rate,
    )

    return ret_data


def to_api_delta_ensemble_vector_statistic_data(
    vector_statistics: VectorStatistics, is_rate: bool, unit: str
) -> schemas.VectorStatisticData:
    """
    Create API VectorStatisticData from service layer VectorStatistics
    """
    value_objects = _create_statistic_value_object_list(vector_statistics)
    ret_data = schemas.VectorStatisticData(
        realizations=vector_statistics.realizations,
        timestamps_utc_ms=vector_statistics.timestamps_utc_ms,
        value_objects=value_objects,
        unit=unit,
        is_rate=is_rate,
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
                value_objects.append(schemas.StatisticValueObject(statistic_function=api_func_enum, values=value_arr))

    return value_objects
