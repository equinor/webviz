import logging
from typing import List, Optional, Sequence
from io import BytesIO

import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import Case, TableCollection
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary.services.service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
    MultipleDataMatchesError,
)

from ._helpers import create_sumo_client, create_sumo_case_async
from .rft_types import RftTableDefinition, RftWellInfo, RftRealizationData

LOGGER = logging.getLogger(__name__)


ALLOWED_RFT_RESPONSE_NAMES = ["PRESSURE", "SGAS", "SWAT", "SOIL"]


class RftAccess:
    def __init__(self, case: Case, iteration_name: str):
        self._case: Case = case
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "RftAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return RftAccess(case=case, iteration_name=iteration_name)

    async def get_rft_info(self) -> RftTableDefinition:
        rft_table_collection = await get_rft_table_collection(self._case, self._iteration_name, column_name=None)

        columns = await rft_table_collection.columns_async
        available_response_names = [col for col in columns if col in ALLOWED_RFT_RESPONSE_NAMES]
        table = await get_concatenated_rft_table(
            self._case, self._iteration_name, column_names=available_response_names
        )
        rft_well_infos: list[RftWellInfo] = []
        well_names = table["WELL"].unique().tolist()

        for well_name in well_names:
            well_table = table.filter(pc.equal(table["WELL"], well_name))
            timestamps_utc_ms = sorted(list(set(well_table["DATE"].to_numpy().astype(int).tolist())))

            rft_well_infos.append(RftWellInfo(well_name=well_name, timestamps_utc_ms=timestamps_utc_ms))

        return RftTableDefinition(response_names=available_response_names, well_infos=rft_well_infos)

    async def get_rft_well_realization_data(
        self,
        well_name: str,
        response_name: str,
        timestamps_utc_ms: Optional[Sequence[int]],
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
        timestamps_utc_ms: Optional[Sequence[int]],
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
        raise MultipleDataMatchesError(
            f"Multiple rft tables found in case={case}, iteration={iteration_name}: {column_name=}",
            Service.SUMO,
        )

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
        raise InvalidDataError("Table does not contain a DATE column", Service.SUMO)

    if not "REAL" in table.column_names:
        raise InvalidDataError("Table does not contain a REAL column", Service.SUMO)
    if not column_name in table.column_names:
        raise InvalidDataError(f"Table does not contain a {column_name} column", Service.SUMO)
    if table.num_columns != 4:
        raise InvalidDataError("Table should contain exactly 4 columns", Service.SUMO)

    # Verify that we got the expected columns
    if sorted(table.column_names) != sorted(["DATE", "REAL", "WELL", column_name]):
        raise InvalidDataError(f"Unexpected columns in table {table.column_names=}", Service.SUMO)

    # Verify that the column datatypes are as we expect
    schema = table.schema
    if schema.field("DATE").type != pa.timestamp("ms"):
        raise InvalidDataError(f"Unexpected type for DATE column {schema.field('DATE').type=}", Service.SUMO)
    if schema.field("REAL").type != pa.int16():
        raise InvalidDataError(f"Unexpected type for REAL column {schema.field('REAL').type=}", Service.SUMO)
    if schema.field(column_name).type != pa.float32():
        raise InvalidDataError(
            f"Unexpected type for {column_name} column {schema.field(column_name).type=}", Service.SUMO
        )

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
    rft_table_collection = case.tables.filter(
        aggregation="collection",
        tagname="rft",
        iteration=iteration_name,
        column=column_name,
    )
    table_names = await rft_table_collection.names_async
    if len(table_names) == 0:
        raise NoDataError(
            f"No rft table collections found in case={case.uuid}, iteration={iteration_name}", Service.SUMO
        )
    if len(table_names) == 1:
        return rft_table_collection

    raise MultipleDataMatchesError(
        f"Multiple rft table collections found in case={case.uuid}, iteration={iteration_name}: {table_names=}",
        Service.SUMO,
    )
