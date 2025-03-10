import logging
from typing import Optional

import pandas as pd
import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from webviz_pkg.core_utils.perf_timer import PerfTimer
from primary.services.service_exceptions import InvalidDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client


LOGGER = logging.getLogger(__name__)


class GroupTreeAccess:
    """
    Class for accessing and retrieving group tree data
    """

    TAGNAME = "gruptree"

    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "GroupTreeAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_group_tree_table_for_realization(self, realization: int) -> Optional[pd.DataFrame]:
        """Get well group tree data for case and iteration"""
        timer = PerfTimer()

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_tagname(GroupTreeAccess.TAGNAME)

        pa_table: pa.Table = await table_loader.get_single_realization_async(realization)

        group_tree_df_pandas = pa_table.to_pandas()
        _validate_group_tree_df(group_tree_df_pandas)

        LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
        return group_tree_df_pandas


def _validate_group_tree_df(df: pd.DataFrame) -> None:
    expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}

    if not expected_columns.issubset(df.columns):
        raise InvalidDataError(f"Expected columns: {expected_columns} - got: {df.columns}", Service.SUMO)
