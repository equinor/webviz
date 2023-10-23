import logging
from typing import List, Optional
from io import BytesIO

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq

from ._helpers import SumoEnsemble

LOGGER = logging.getLogger(__name__)


class RftAccess(SumoEnsemble):
    async def get_well_names(self) -> list[str]:
        table = await self._get_rft_table()
        return table["WELL"].unique().tolist()

    async def get_dates(self, well_name: str) -> list[str]:
        table = await self._get_rft_table()
        mask = pc.equal(table["WELL"], well_name)
        table = table.filter(mask)
        return table["DATE"].unique().tolist()

    async def _get_rft_table(self) -> Optional[pa.Table]:
        rft_table_collection = self._case.tables.filter(
            aggregation="collection",
            tagname="rft",
            iteration=self._iteration_name,
        )
        if len(rft_table_collection.names) == 0:
            raise ValueError("No RFT table found in Sumo case")
        if len(rft_table_collection.names) > 1:
            raise ValueError("Multiple RFT tables found in Sumo case")
        rft_table_name = rft_table_collection.names[0]
        rft_table_collection = self._case.tables.filter(
            name=rft_table_name,
            aggregation="collection",
            tagname="rft",
            iteration=self._iteration_name,
        )
        column_names = await rft_table_collection.columns_async
        print("column names", column_names)
        rft_table_handle = rft_table_collection[0]
        byte_stream: BytesIO = rft_table_handle.blob
        table = pq.read_table(byte_stream)
        print(table)
        return table
