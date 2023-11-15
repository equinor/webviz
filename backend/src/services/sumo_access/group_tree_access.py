import logging
from io import BytesIO
from typing import Dict, Iterator, List, Optional, Set, Tuple

import pandas as pd
from src.services.utils.perf_timer import PerfTimer

from ._helpers import SumoEnsemble

LOGGER = logging.getLogger(__name__)


class GroupTreeAccess(SumoEnsemble):
    """
    Class for accessing and retrieving group tree data
    """

    TAGNAME = "gruptree"

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
                raise ValueError(f"Multiple tables found.")

            group_tree_df = table_collection[0].to_pandas

            _validate_group_tree_df(group_tree_df)

            LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms (")
            return group_tree_df

        else:
            table_collection = self._case.tables.filter(
                tagname=GroupTreeAccess.TAGNAME, aggregation="collection", iteration=self._iteration_name
            )
            raise NotImplementedError("Multiple realizations not implemented.")


def _validate_group_tree_df(df: pd.DataFrame) -> None:
    expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}

    if not expected_columns.issubset(df.columns):
        raise ValueError(f"Expected columns: {expected_columns} - got: {df.columns}")
