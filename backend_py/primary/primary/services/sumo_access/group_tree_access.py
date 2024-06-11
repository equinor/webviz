import logging
from typing import Optional

import pandas as pd
from fmu.sumo.explorer.objects import Case

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client, create_sumo_case_async


LOGGER = logging.getLogger(__name__)


class GroupTreeAccess:
    """
    Class for accessing and retrieving group tree data
    """

    TAGNAME = "gruptree"

    def __init__(self, case: Case, iteration_name: str):
        self._case = case
        self._iteration_name = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "GroupTreeAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(sumo_client, case_uuid, want_keepalive_pit=False)
        return GroupTreeAccess(case, iteration_name)

    async def get_group_tree_table(self, realization: Optional[int]) -> Optional[pd.DataFrame]:
        """Get well group tree data for case and iteration"""
        timer = PerfTimer()

        # With single realization, filter on realization
        if realization is not None:
            table_collection = self._case.tables.filter(
                tagname=GroupTreeAccess.TAGNAME, realization=realization, iteration=self._iteration_name
            )
            if await table_collection.length_async() == 0:
                return None
            if await table_collection.length_async() > 1:
                raise ValueError("Multiple tables found.")

            group_tree_df = table_collection[0].to_pandas

            _validate_group_tree_df(group_tree_df)

            LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
            return group_tree_df

        # If no realization is specified, get all tables and merge them
        table_collection = self._case.tables.filter(
            tagname=GroupTreeAccess.TAGNAME, aggregation="collection", iteration=self._iteration_name
        )

        df0 = table_collection[0].to_pandas
        df1 = table_collection[1].to_pandas
        df2 = table_collection[2].to_pandas

        group_tree_df = pd.merge(df0, df1, left_index=True, right_index=True)
        group_tree_df = pd.merge(group_tree_df, df2, left_index=True, right_index=True)

        _validate_group_tree_df(group_tree_df)

        LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
        return group_tree_df


def _validate_group_tree_df(df: pd.DataFrame) -> None:
    expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}

    if not expected_columns.issubset(df.columns):
        raise ValueError(f"Expected columns: {expected_columns} - got: {df.columns}")
