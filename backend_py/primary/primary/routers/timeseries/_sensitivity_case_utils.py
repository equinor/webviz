import pyarrow as pa
import pyarrow.compute as pc
from fastapi import HTTPException

from webviz_services.utils.statistic_function import StatisticFunction
from webviz_services.summary_vector_statistics import compute_vector_statistics, VectorStatistics


def compute_sensitivity_case_vector_statistics(
    vector_table: pa.Table,
    vector_name: str,
    case_realizations: list[int],
    requested_realizations: list[int] | None,
    statistics_to_compute: list[StatisticFunction] | None,
) -> VectorStatistics:
    """Compute vector statistics for a single sensitivity case.

    Raises HTTPException if the combination of realizations yields no data,
    or if statistics could not be computed.
    """
    requested_mask = (
        pc.is_in(vector_table["REAL"], value_set=pa.array(requested_realizations)) if requested_realizations else None
    )
    case_mask = pc.is_in(vector_table["REAL"], value_set=pa.array(case_realizations))
    if requested_mask is not None:
        case_mask = pc.and_(requested_mask, case_mask)

    case_table = vector_table.filter(case_mask)

    if case_table.num_rows == 0 and requested_mask is not None:
        raise HTTPException(
            status_code=404,
            detail="The combination of realizations to include and sensitivity case realizations results in no valid realizations",
        )

    vector_statistics = compute_vector_statistics(case_table, vector_name, statistics_to_compute)
    if not vector_statistics:
        raise HTTPException(status_code=404, detail="Could not compute statistics")

    return vector_statistics
