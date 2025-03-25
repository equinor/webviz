import logging
from io import BytesIO

from typing import List, Sequence, Any
from dataclasses import dataclass
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
import polars as pl
from polars.exceptions import ComputeError
import pyarrow as pa
import pyarrow.compute as pc

from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from .sumo_client_factory import create_sumo_client
from ..service_exceptions import Service, NoDataError

from .queries.relperm import (
    get_relperm_table_names_and_columns,
    get_relperm_realization_table_blob_uuids,
)
from .relperm_types import RealizationBlobid
from ._arrow_table_loader import ArrowTableLoader

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
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "RelPermAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_relperm_table_names_async(self) -> List[str]:
        table_names_and_columns = await get_relperm_table_names_and_columns(
            self._sumo_client, self._case_uuid, self._iteration_name
        )
        table_names: List[str] = []
        for table_info in table_names_and_columns:
            if has_required_relperm_table_columns(table_info.table_name, table_info.column_names):
                table_names.append(table_info.table_name)
        return table_names

    async def get_single_realization_table_async(self, table_name: str) -> pl.DataFrame:
        realization_blob_ids = await get_relperm_realization_table_blob_uuids(
            self._sumo_client, self._case_uuid, self._iteration_name, table_name
        )
        if len(realization_blob_ids) == 0:
            raise NoDataError(f"No realizations found for table '{table_name}'", Service.SUMO)

        single_realization_blob_id = realization_blob_ids[0]
        res = await self.fetch_realization_table_async(single_realization_blob_id)
        blob = BytesIO(res.content)
        try:
            real_df = pl.read_parquet(blob)
        except ComputeError as exp:
            raise NoDataError(f"Error reading parquet file: {exp}", Service.SUMO) from exp

        # Add realization id to the dataframe
        real_df = real_df.with_columns(pl.lit(single_realization_blob_id.realization_id).alias("REAL"))
        return real_df

    async def get_relperm_table_async(
        self,
        table_name: str,
        realizations: Sequence[int] | None = None,
    ) -> pl.DataFrame:
        perf_metrics = PerfMetrics()

        table_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name, content="relperm"
        )
        table_names = await table_context.names_async
        if table_name not in table_names:
            raise NoDataError(f"Table '{table_name}' not found in iteration '{self._iteration_name}'", Service.SUMO)

        columns = await table_context.columns_async
        arrow_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        arrow_loader.require_content_type("relperm")
        if "REAL" in columns:
            columns.remove("REAL")
        arrow_table = await arrow_loader.get_aggregated_multiple_columns_async(columns)
        if realizations is not None:
            requested_reals_arr = pa.array(realizations)
            mask = pc.is_in(arrow_table["REAL"], value_set=requested_reals_arr)
            arrow_table = arrow_table.filter(mask)
        pl_table = pl.DataFrame(arrow_table)
        LOGGER.debug(f"Loaded relperm table '{table_name}'. {perf_metrics.to_string_s()}")
        return pl_table

    async def fetch_realization_table_async(self, realization_blob_id: RealizationBlobid) -> Any:
        res = await self._sumo_client.get_async(f"/objects('{realization_blob_id.blob_name}')/blob")
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
