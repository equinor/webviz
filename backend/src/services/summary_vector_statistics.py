import datetime
from enum import Enum
from typing import Dict, List, Optional, Sequence

import numpy as np
import pandas as pd
import pyarrow as pa
from pydantic import BaseModel

from .sumo_access._arrow_helpers import create_float_downcasting_schema, set_date_column_type_to_timestamp_ms
from .sumo_access.types import VectorMetadata


class StatisticFunction(Enum):
    MIN = "MIN"
    MAX = "MAX"
    MEAN = "MEAN"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"

    @classmethod
    def from_string_value(cls, value: str) -> Optional["StatisticFunction"]:
        try:
            return cls(value)
        except ValueError:
            return None


class VectorStatistics(BaseModel):
    realizations: List[int]
    timestamps: List[datetime.datetime]
    values_dict: Dict[StatisticFunction, List[float]]


def compute_vector_statistics_table(
    summary_vector_table: pa.Table, vector_name: str, statistic_functions: Optional[Sequence[StatisticFunction]]
) -> Optional[pa.Table]:
    """
    Compute statistics for specified summary vector in the pyarrow table.
    If statistics is None, all available statistics are computed.
    Returns a pyarrow.Table with a DATE column and then one column for each statistic.
    """

    if statistic_functions is None:
        statistic_functions = [
            StatisticFunction.MIN,
            StatisticFunction.MAX,
            StatisticFunction.MEAN,
            StatisticFunction.P10,
            StatisticFunction.P90,
            StatisticFunction.P50,
        ]

    # Invert p10 and p90 due to oil industry convention.
    def p10_func(x: List[float]) -> np.floating:
        return np.nanpercentile(x, q=90)

    def p90_func(x: List[float]) -> np.floating:
        return np.nanpercentile(x, q=10)

    def p50_func(x: List[float]) -> np.floating:
        return np.nanpercentile(x, q=50)

    agg_dict = {}
    for stat_func in statistic_functions:
        if stat_func == StatisticFunction.MIN:
            agg_dict["MIN"] = pd.NamedAgg(column=vector_name, aggfunc=np.nanmin)
        elif stat_func == StatisticFunction.MAX:
            agg_dict["MAX"] = pd.NamedAgg(column=vector_name, aggfunc=np.nanmax)
        elif stat_func == StatisticFunction.MEAN:
            agg_dict["MEAN"] = pd.NamedAgg(column=vector_name, aggfunc=np.nanmean)
        elif stat_func == StatisticFunction.P10:
            agg_dict["P10"] = pd.NamedAgg(column=vector_name, aggfunc=p10_func)
        elif stat_func == StatisticFunction.P90:
            agg_dict["P90"] = pd.NamedAgg(column=vector_name, aggfunc=p90_func)
        elif stat_func == StatisticFunction.P50:
            agg_dict["P50"] = pd.NamedAgg(column=vector_name, aggfunc=p50_func)

    if not agg_dict:
        raise ValueError("At least one statistic must be requested")

    if summary_vector_table.num_rows == 0:
        return None

    df = summary_vector_table.select(["DATE", vector_name]).to_pandas(timestamp_as_object=True)

    grouped: pd.DataFrameGroupBy = df.groupby("DATE", as_index=False, sort=True)
    statistics_df: pd.DataFrame = grouped.agg(**agg_dict)

    default_schema = pa.Schema.from_pandas(statistics_df, preserve_index=False)
    schema_to_use = set_date_column_type_to_timestamp_ms(default_schema)
    schema_to_use = create_float_downcasting_schema(schema_to_use)

    statistics_table = pa.Table.from_pandas(statistics_df, schema=schema_to_use, preserve_index=False)

    return statistics_table


def compute_vector_statistics(
    summary_vector_table: pa.Table, vector_name: str, statistic_functions: Optional[Sequence[StatisticFunction]]
) -> Optional[VectorStatistics]:
    statistics_table = compute_vector_statistics_table(summary_vector_table, vector_name, statistic_functions)
    if not statistics_table:
        return None

    unique_realizations: List[int] = []
    if "REAL" in summary_vector_table.column_names:
        unique_realizations = summary_vector_table.column("REAL").unique().to_pylist()

    values_dict: Dict[StatisticFunction, List[float]] = {}
    column_names = statistics_table.column_names
    for stat_func in StatisticFunction:
        if stat_func.value in column_names:
            values_dict[stat_func] = statistics_table.column(stat_func.value).to_pylist()

    ret_data = VectorStatistics(
        realizations=unique_realizations,
        timestamps=statistics_table["DATE"].to_numpy().astype(datetime.datetime).tolist(),
        values_dict=values_dict,
    )

    return ret_data
