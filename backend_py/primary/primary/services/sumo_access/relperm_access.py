from enum import Enum
import logging
from io import BytesIO
import asyncio
from typing import List, Optional, Dict
from dataclasses import dataclass
from fmu.sumo.explorer.objects import Case, TableCollection
import polars as pl
import pyarrow as pa

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client, create_sumo_case_async
from ..service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
)

from .queries.relperm import get_relperm_table_names_and_columns, get_relperm_realization_table_blob_uuids
from .relperm_types import RelPermTableInfo, RealizationBlobid


class RelPermFamily(str, Enum):
    """Enumeration of relative permeability keyword families"""

    FAMILY_1 = "family_1"  # SWOF, SGOF, SLGOF family
    FAMILY_2 = "family_2"  # SWFN, SGFN, SOF3 family


LOGGER = logging.getLogger(__name__)


@dataclass
class RelPermSaturationInfo:
    name: str
    relperm_curve_names: List[str]
    capillary_pressure_curve_names: List[str]


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

    async def get_relperm_tables_info(self) -> List[RelPermTableInfo]:
        table_names_and_columns = await get_relperm_table_names_and_columns(
            self._case._sumo, self._case_uuid, self._iteration_name
        )

        valid_table_names_and_columns = []
        for table_info in table_names_and_columns:
            if validate_relperm_columns(table_info):
                valid_table_names_and_columns.append(table_info)
        test = await self.get_relperm_table("DROGON")
        return valid_table_names_and_columns

    async def get_relperm_table(self, table_name: str) -> TableCollection:
        realization_blob_ids = await get_relperm_realization_table_blob_uuids(
            self._case._sumo, self._case_uuid, self._iteration_name, "DROGON"
        )
        tasks = [asyncio.create_task(self.fetch_realization_table(table)) for table in realization_blob_ids]
        realization_tables = await asyncio.gather(*tasks)
        table = pl.concat(realization_tables)
        print(table)

    async def fetch_realization_table(self, realization_blob_id: RealizationBlobid) -> pl.DataFrame:
        res = await self._case._sumo.get_async(f"/objects('{realization_blob_id.blob_name}')/blob")
        blob = BytesIO(res.content)
        real_df = pl.read_parquet(blob)
        # Add realization id to the dataframe
        real_df = real_df.with_columns(pl.lit(realization_blob_id.realization_id).alias("REAL"))
        return real_df


def validate_relperm_columns(table_info: RelPermTableInfo) -> bool:
    if "KEYWORD" not in table_info.column_names:
        LOGGER.warning(f"Missing 'KEYWORD' column in table '{table_info.table_name}'")
        return False
    if "SATNUM" not in table_info.column_names:
        LOGGER.warning(f"Missing 'SATNUM' column in table '{table_info.table_name}'")
        return False
    if not any(saturation in table_info.column_names for saturation in ["SW", "SO", "SG", "SL"]):
        LOGGER.warning(f"Missing saturation columns in table '{table_info.table_name}'")
        return False
    return True
