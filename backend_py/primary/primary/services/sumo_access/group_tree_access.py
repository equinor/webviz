import logging
from typing import Optional

import pandas as pd
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client, create_sumo_case_async


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
    def from_case_uuid_and_ensemble_name(
        cls, access_token: str, case_uuid: str, iteration_name: str
    ) -> "GroupTreeAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    @property
    def ensemble_context(self) -> SearchContext:
        return self._ensemble_context

    async def get_group_tree_table_for_realization(self, realization: int) -> Optional[pd.DataFrame]:
        """Get well group tree data for case and iteration"""
        timer = PerfTimer()

        table_context = self.ensemble_context.filter(
            cls="table", tagname=GroupTreeAccess.TAGNAME, realization=realization
        )
        table_count = await table_context.length_async()
        if table_count == 0:
            return None
        if table_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple tables found for {realization=} {self._case_uuid},{self._iteration_name}, {GroupTreeAccess.TAGNAME}",
                service=Service.SUMO,
            )
        table_context = await table_context.getitem_async(0)
        group_tree_df = await table_context.to_pandas_async()

        _validate_group_tree_df(group_tree_df)

        LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
        return group_tree_df


def _validate_group_tree_df(df: pd.DataFrame) -> None:
    expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}

    if not expected_columns.issubset(df.columns):
        raise ValueError(f"Expected columns: {expected_columns} - got: {df.columns}")
