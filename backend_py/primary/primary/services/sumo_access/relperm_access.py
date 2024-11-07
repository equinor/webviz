from enum import Enum
import logging
from io import BytesIO
import asyncio
from typing import List, Optional, Dict, Sequence, Any
from dataclasses import dataclass
from fmu.sumo.explorer.objects import Case, TableCollection
import polars as pl
import pyarrow as pa

from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from ._helpers import create_sumo_client, create_sumo_case_async
from ..service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
)

from .queries.relperm import (
    get_relperm_table_names_and_columns,
    get_relperm_realization_table_blob_uuids,
)
from .relperm_types import RelPermTableInfo, RealizationBlobid


SATURATIONS = ["SW", "SO", "SG", "SL"]


LOGGER = logging.getLogger(__name__)


@dataclass
class RelPermSaturationInfo:
    name: str
    relperm_curve_names: List[str]
    capillary_pressure_curve_names: List[str]


@dataclass
class RelpermCurveData:
    curve_name: str
    curve_data: List[float]


@dataclass
class RelPermEnsembleSaturationData:
    saturation_curve_data: List[float]
    relperm_curves_data: List[RelpermCurveData]
    realizations: List[int]


class RelPermAccess:
    def __init__(self, case: Case, case_uuid: str, iteration_name: str):
        self._case: Case = case
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "RelPermAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return RelPermAccess(case=case, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_relperm_table_names(self) -> List[str]:
        table_names_and_columns = await get_relperm_table_names_and_columns(
            self._case._sumo, self._case_uuid, self._iteration_name
        )
        table_names: List[str] = []
        for table_info in table_names_and_columns:
            if has_required_relperm_table_columns(table_info.table_name, table_info.column_names):
                table_names.append(table_info.table_name)
        return table_names

    async def get_single_realization_table(self, table_name: str) -> pl.DataFrame:
        realization_blob_ids = await get_relperm_realization_table_blob_uuids(
            self._case._sumo, self._case_uuid, self._iteration_name, table_name
        )
        single_realization_blob_id = realization_blob_ids[0]
        res = await self.fetch_realization_table(single_realization_blob_id)
        blob = BytesIO(res.content)
        real_df = pl.read_parquet(blob)
        # Add realization id to the dataframe
        real_df = real_df.with_columns(pl.lit(single_realization_blob_id.realization_id).alias("REAL"))
        return real_df

    async def get_relperm_table(
        self,
        table_name: str,
        realizations: Sequence[int] | None = None,
    ) -> pl.DataFrame:
        perf_metrics = PerfMetrics()
        realization_blob_ids = await get_relperm_realization_table_blob_uuids(
            self._case._sumo, self._case_uuid, self._iteration_name, table_name
        )
        perf_metrics.record_lap("get_relperm_realization_table_blob_uuids")

        tasks = [asyncio.create_task(self.fetch_realization_table(table)) for table in realization_blob_ids]

        realization_tables_res = await asyncio.gather(*tasks)
        perf_metrics.record_lap("fetch_realization_tables")
        realization_tables = []
        for res, realization_blob_id in zip(realization_tables_res, realization_blob_ids):
            blob = BytesIO(res.content)
            real_df = pl.read_parquet(blob)
            # Add realization id to the dataframe
            real_df = real_df.with_columns(pl.lit(realization_blob_id.realization_id).alias("REAL"))
            realization_tables.append(real_df)

        table = pl.concat(realization_tables)
        perf_metrics.record_lap("concat_realization_tables")

        LOGGER.debug(f"RelPermAccess.get_relperm_table: {perf_metrics.to_string()}")
        return table

    async def fetch_realization_table(self, realization_blob_id: RealizationBlobid) -> Any:
        res = await self._case._sumo.get_async(f"/objects('{realization_blob_id.blob_name}')/blob")
        return res


def has_required_relperm_table_columns(table_name: str, column_names: List[str]) -> bool:
    if "KEYWORD" not in column_names:
        LOGGER.warning(f"Missing 'KEYWORD' column in table '{table_name}'")
        return False
    if "SATNUM" not in column_names:
        LOGGER.warning(f"Missing 'SATNUM' column in table '{table_name}'")
        return False
    if not any(saturation in column_names for saturation in ["SW", "SO", "SG", "SL"]):
        LOGGER.warning(f"Missing saturation columns in table '{table_name}'")
        return False
    return True


def get_saturation_names(column_names: List[str]) -> List[str]:
    return [sat for sat in SATURATIONS if sat in column_names]
