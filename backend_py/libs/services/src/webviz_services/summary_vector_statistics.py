from dataclasses import dataclass
from typing import Sequence, cast

import polars as pl
import pyarrow as pa


from .utils.arrow_helpers import create_float_downcasting_schema
from .utils.statistic_function import StatisticFunction
from .service_exceptions import Service, InvalidParameterError


@dataclass
class VectorStatistics:
    """
    Data class to hold vector statistics results.
    """

    realizations: list[int]
    timestamps_utc_ms: list[int]
    values_dict: dict[StatisticFunction, list[float]]


def compute_vector_statistics_table(
    summary_vector_table: pa.Table,
    vector_name: str,
    statistic_functions: Sequence[StatisticFunction] | None,
) -> pa.Table | None:
    """
    Compute statistics for specified summary vector in the pyarrow table.
    If statistics is None, all available statistics are computed.
    Returns a pyarrow.Table with a DATE column and then one column for each statistic.
    """
    if statistic_functions is not None and len(statistic_functions) == 0:
        raise InvalidParameterError("At least one statistic must be requested", Service.GENERAL)

    if summary_vector_table.num_rows == 0:
        return None

    if statistic_functions is None:
        statistic_functions = [
            StatisticFunction.MIN,
            StatisticFunction.MAX,
            StatisticFunction.MEAN,
            StatisticFunction.P10,
            StatisticFunction.P90,
            StatisticFunction.P50,
        ]

    # Polars column expression without NaN values for aggregations (null value dropped by default)
    valid_col_expr = pl.col(vector_name).drop_nans()

    # Build list of statistic expressions based on requested functions
    statistics_expressions: list[pl.Expr] = []
    for stat_func in statistic_functions:
        if stat_func == StatisticFunction.MIN:
            statistics_expressions.append(valid_col_expr.min().alias("MIN"))
        elif stat_func == StatisticFunction.MAX:
            statistics_expressions.append(valid_col_expr.max().alias("MAX"))
        elif stat_func == StatisticFunction.MEAN:
            statistics_expressions.append(valid_col_expr.mean().alias("MEAN"))
        elif stat_func == StatisticFunction.P10:
            # Inverted due to oil industry convention (P10 = 90th percentile)
            statistics_expressions.append(valid_col_expr.quantile(0.9, interpolation="linear").alias("P10"))
        elif stat_func == StatisticFunction.P90:
            # Inverted due to oil industry convention (P90 = 10th percentile)
            statistics_expressions.append(valid_col_expr.quantile(0.1, interpolation="linear").alias("P90"))
        elif stat_func == StatisticFunction.P50:
            statistics_expressions.append(valid_col_expr.quantile(0.5, interpolation="linear").alias("P50"))

    # Create Polars DataFrame from Arrow table and compute statistics
    # - Polars seems to perform aggregations in float64 for precision, even if input is float32,
    #   and then cast back to float32 if input was float32.
    vector_df = pl.DataFrame(summary_vector_table.select(["DATE", vector_name]))
    statistics_df = vector_df.group_by("DATE", maintain_order=True).agg(statistics_expressions).sort("DATE")

    # Convert to PyArrow
    statistics_table = statistics_df.to_arrow()

    # Downcast float64 columns after computations to save memory
    schema_to_use = create_float_downcasting_schema(statistics_table.schema)
    statistics_table = statistics_table.cast(schema_to_use)

    return statistics_table


def compute_vector_statistics(
    summary_vector_table: pa.Table,
    vector_name: str,
    statistic_functions: Sequence[StatisticFunction] | None,
) -> VectorStatistics | None:
    statistics_table = compute_vector_statistics_table(summary_vector_table, vector_name, statistic_functions)
    if not statistics_table:
        return None

    unique_realizations: list[int] = []
    if "REAL" in summary_vector_table.column_names:
        # ! We assume the list never has None-values
        unique_realizations = cast(
            list[int], summary_vector_table.column("REAL").unique().to_numpy().astype(int).tolist()
        )

    values_dict: dict[StatisticFunction, list[float]] = {}
    column_names = statistics_table.column_names
    for stat_func in StatisticFunction:
        if stat_func.value in column_names:
            # ! We assume the list never has None-values
            values_dict[stat_func] = cast(list[float], statistics_table.column(stat_func.value).to_numpy().tolist())

    ret_data = VectorStatistics(
        realizations=unique_realizations,
        timestamps_utc_ms=statistics_table["DATE"].to_numpy().astype(int).tolist(),
        values_dict=values_dict,
    )

    return ret_data
