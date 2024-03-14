import logging
from typing import List, Optional, Sequence
from io import BytesIO

import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import Case, TableCollection
from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import SumoEnsemble
from .rft_types import RftInfo, RftRealizationData

LOGGER = logging.getLogger(__name__)


class RftAccess(SumoEnsemble):
    async def get_rft_info(self) -> list[RftInfo]:
        table = await get_concatenated_rft_table(self._case, self._iteration_name, column_names=["PRESSURE"])
        rft_well_infos: list[RftInfo] = []
        well_names = table["WELL"].unique().tolist()

        for well_name in well_names:
            well_table = table.filter(pc.equal(table["WELL"], well_name))
            timestamps_utc_ms = sorted(list(set(well_table["DATE"].to_numpy().astype(int).tolist())))

            rft_well_infos.append(RftInfo(well_name=well_name, timestamps_utc_ms=timestamps_utc_ms))

        return rft_well_infos

    async def get_rft_well_realization_data(
        self,
        well_name: str,
        response_name: str,
        timestamps_utc_ms: Optional[int],
        realizations: Optional[Sequence[int]],
    ) -> List[RftRealizationData]:
        column_names = [response_name, "DEPTH"]
        table = await self.get_rft_table(
            well_names=[well_name],
            column_names=column_names,
            timestamps_utc_ms=timestamps_utc_ms,
            realizations=realizations,
        )
        pandas_table = table.to_pandas(types_mapper=pd.ArrowDtype)

        ret_arr: List[RftRealizationData] = []

        for real, real_df in pandas_table.groupby("REAL"):
            for datetime, date_df in real_df.groupby("DATE"):
                ret_arr.append(
                    RftRealizationData(
                        well_name=well_name,
                        realization=real,
                        timestamp_utc_ms=datetime.timestamp() * 1000,
                        depth_arr=date_df["DEPTH"],
                        value_arr=date_df[response_name],
                    )
                )

        return ret_arr

    async def get_rft_table(
        self,
        well_names: List[str],
        column_names: List[str],
        timestamps_utc_ms: Optional[int],
        realizations: Optional[Sequence[int]],
    ) -> pa.table:
        table = await get_concatenated_rft_table(self._case, self._iteration_name, column_names)

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)
        mask = pc.is_in(table["WELL"], value_set=pa.array(well_names))
        table = table.filter(mask)
        if timestamps_utc_ms is not None:
            mask = pc.is_in(table["DATE"], value_set=pa.array(timestamps_utc_ms))
            table = table.filter(mask)

        return table


async def get_concatenated_rft_table(case: Case, iteration_name: str, column_names: List[str]) -> pa.Table:
    concatenated_table = None
    for column_name in column_names:
        table = await _load_arrow_table_for_from_sumo(case, iteration_name, column_name=column_name)

        if concatenated_table is None:
            concatenated_table = table
        else:
            concatenated_table = concatenated_table.append_column(column_name, table[column_name])

    return concatenated_table


async def _load_arrow_table_for_from_sumo(case: Case, iteration_name: str, column_name: str) -> Optional[pa.Table]:
    timer = PerfTimer()

    rft_table_collection = await get_rft_table_collection(case, iteration_name, column_name=column_name)
    if await rft_table_collection.length_async() == 0:
        return None
    if await rft_table_collection.length_async() > 1:
        raise ValueError(f"Multiple tables found for vector {column_name=}")

    sumo_table = await rft_table_collection.getitem_async(0)
    # print(f"{sumo_table.format=}")
    et_locate_sumo_table_ms = timer.lap_ms()

    # Now, read as an arrow table
    # Note!!!
    # The tables we have seen so far have format set to 'arrow', but the actual data is in parquet format.
    # This must be a bug or a misunderstanding.
    # For now, just read the parquet data into an arrow table
    byte_stream: BytesIO = await sumo_table.blob_async
    table = pq.read_table(byte_stream)
    et_download_arrow_table_ms = timer.lap_ms()

    # Verify that we got the expected columns
    if not "DATE" in table.column_names:
        raise ValueError("Table does not contain a DATE column")
    if not "REAL" in table.column_names:
        raise ValueError("Table does not contain a REAL column")
    if not column_name in table.column_names:
        raise ValueError(f"Table does not contain a {column_name} column")
    if table.num_columns != 4:
        raise ValueError("Table should contain exactly 4 columns")

    # Verify that we got the expected columns
    if sorted(table.column_names) != sorted(["DATE", "REAL", "WELL", column_name]):
        raise ValueError(f"Unexpected columns in table {table.column_names=}")

    # Verify that the column datatypes are as we expect
    schema = table.schema
    if schema.field("DATE").type != pa.timestamp("ms"):
        raise ValueError(f"Unexpected type for DATE column {schema.field('DATE').type=}")
    if schema.field("REAL").type != pa.int16():
        raise ValueError(f"Unexpected type for REAL column {schema.field('REAL').type=}")
    if schema.field(column_name).type != pa.float32():
        raise ValueError(f"Unexpected type for {column_name} column {schema.field(column_name).type=}")

    LOGGER.debug(
        f"Loaded arrow table from Sumo in: {timer.elapsed_ms()}ms ("
        f"locate_sumo_table={et_locate_sumo_table_ms}ms, "
        f"download_arrow_table={et_download_arrow_table_ms}ms) "
        f"{column_name=} {table.shape=}"
    )

    return table


async def get_rft_table_collection(
    case: Case, iteration_name: str, column_name: Optional[str] = None
) -> TableCollection:
    """Get a collection of rft tables for a case and iteration"""
    rft_table_collection = case.tables.filter(
        aggregation="collection",
        tagname="rft",
        iteration=iteration_name,
    )
    table_names = await rft_table_collection.names_async
    print(table_names)
    rft_table_collection = case.tables.filter(
        aggregation="collection",
        tagname="rft",
        iteration=iteration_name,
        column=column_name,
    )
    table_names = await rft_table_collection.names_async
    if len(table_names) == 0:
        raise ValueError("No rft table collections found")
    if len(table_names) == 1:
        return rft_table_collection

    raise ValueError(f"Multiple rft table collections found: {table_names}. Expected only one.")
