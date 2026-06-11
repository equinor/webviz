import logging
from typing import List, Optional, Sequence, cast

import polars as pl
from fmu.datamodels.standard_results.enums import StandardResultName
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import (
    Service,
    NoDataError,
    MultipleDataMatchesError,
)

from ._arrow_table_loader import ArrowTableLoader
from .rft_types import RftTableDefinition, RftWellInfo, RftRealizationData
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


ALLOWED_RFT_RESPONSE_NAMES = ["PRESSURE", "SGAS", "SWAT", "SOIL"]


class RftAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "RftAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_rft_info_async(self) -> RftTableDefinition:
        """Get a collection of rft tables for a case and ensemble"""
        timer = PerfMetrics()

        table_context = self._ensemble_context.filter(cls="table", tagname="rft")

        table_names = await table_context.names_async
        timer.record_lap("get_table_names")

        if len(table_names) == 0:
            raise NoDataError(
                f"No rft tables found in case={self._case_uuid}, ensemble={self._ensemble_name}", Service.SUMO
            )
        if len(table_names) > 1:
            raise MultipleDataMatchesError(
                f"Multiple rft tables found in case={self._case_uuid}, ensemble={self._ensemble_name}: {table_names=}",
                Service.SUMO,
            )

        columns = await table_context.columns_async
        available_response_names = [col for col in columns if col in ALLOWED_RFT_RESPONSE_NAMES]

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.rft)
        table_loader.require_table_name(table_names[0])
        table = await table_loader.get_aggregated_multiple_columns_async(available_response_names)
        timer.record_lap("load_aggregated_arrow_table")
        grouped = (
            cast(pl.DataFrame, pl.from_arrow(table))
            .lazy()
            .select(["WELL", "DATE"])
            .unique()
            .with_columns(pl.col("DATE").dt.timestamp("ms").alias("timestamp_utc_ms"))
            .group_by("WELL")
            .agg(pl.col("timestamp_utc_ms").sort())
            .collect()
        )
        rft_well_infos = [
            RftWellInfo(well_name=row["WELL"], timestamps_utc_ms=row["timestamp_utc_ms"])
            for row in grouped.iter_rows(named=True)
        ]

        timer.record_lap("process_well_infos")
        LOGGER.debug(f"{timer.to_string()}, {self._case_uuid=}, {self._ensemble_name=}")
        return RftTableDefinition(response_names=available_response_names, well_infos=rft_well_infos)

    async def get_rft_well_realization_data_async(
        self,
        well_name: str,
        response_name: str,
        timestamps_utc_ms: Optional[Sequence[int]],
        realizations: Optional[Sequence[int]],
    ) -> List[RftRealizationData]:

        timer = PerfMetrics()
        column_names = [response_name, "DEPTH"]

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_standard_result(StandardResultName.rft)

        table = await table_loader.get_aggregated_multiple_columns_async(column_names)

        timer.record_lap("load_aggregated_arrow_table")

        pl_table = cast(pl.DataFrame, pl.from_arrow(table)).lazy()

        if realizations is not None:
            pl_table = pl_table.filter(pl.col("REAL").is_in(realizations))

        pl_table = pl_table.filter(pl.col("WELL") == well_name)

        if timestamps_utc_ms is not None:
            pl_table = pl_table.filter(pl.col("DATE").dt.timestamp("ms").is_in(list(timestamps_utc_ms)))

        timer.record_lap("filter_table")
        result_table = (
            pl_table.group_by(["REAL", "DATE"])
            .agg([pl.col("DEPTH").alias("depth_arr"), pl.col(response_name).alias("value_arr")])
            .select([
                pl.lit(well_name).alias("well_name"),
                pl.col("REAL").alias("realization"),
                pl.col("DATE").dt.timestamp("ms").alias("timestamp_utc_ms"),
                "depth_arr",
                "value_arr",
            ])
            .collect()
        )
        timer.record_lap("process_table_in_polars")
        ret_arr_rows = result_table.iter_rows(named=True)
        ret_arr = [RftRealizationData(**row) for row in ret_arr_rows]
        LOGGER.debug(f"{timer.to_string()}, {self._case_uuid=}, {self._ensemble_name=}, {well_name=}, {response_name=}")
        return ret_arr
