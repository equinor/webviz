import logging
from io import BytesIO
from typing import List, Optional

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import Case
from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service
from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import create_sumo_case_async, create_sumo_client
from .vfp_types import ALQ, GFR, WFR, FlowRateType, TabType, UnitType, VfpTable, VfpType

LOGGER = logging.getLogger(__name__)


class VfpAccess:
    """
    Class for accessing and retrieving Vfp tables
    """

    def __init__(self, case: Case, iteration_name: str):
        self._case = case
        self._iteration_name = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "VFPAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(sumo_client, case_uuid, want_keepalive_pit=False)
        return VfpAccess(case, iteration_name)

    async def get_all_vfp_table_names_for_realization(self, realization: int) -> List[str]:
        """Returns all VFP table names/tagnames for a realization."""
        table_collection = self._case.tables.filter(
            content="lift_curves", realization=1, iteration=self._iteration_name
        )
        table_count = await table_collection.length_async()
        if table_count == 0:
            raise NoDataError(f"No VFP tables found for realization: {realization}", Service.SUMO)
        return table_collection.tagnames

    async def get_vfp_table_from_tagname_as_pyarrow(self, tagname: str, realization: int) -> pa.Table:
        """Returns a VFP table as a pyarrow table for a specific tagname (table name)
        and realization.
        """
        table_collection = self._case.tables.filter(
            tagname=tagname, realization=realization, iteration=self._iteration_name
        )

        table_count = await table_collection.length_async()
        if table_count == 0:
            raise NoDataError(
                f"No VFP table found with tagname: {tagname} and realization: {realization}", Service.SUMO
            )
        if table_count > 1:
            table_names = await table_collection.names_async
            raise MultipleDataMatchesError(
                f"Multiple VFP tables found with tagname: {tagname} and realization: {realization}", Service.SUMO
            )

        sumo_table = table_collection[0]
        byte_stream: BytesIO = await sumo_table.blob_async
        pa_table: pa.Table = pq.read_table(byte_stream)

        return pa_table

    async def get_vfp_table_from_tagname(self, tagname: str, realization: int) -> VfpTable:
        """Returns a VFP table as a VFP table object for a specific tagname (table name)
        and realization.
        """

        pa_table = await self.get_vfp_table_from_tagname_as_pyarrow(tagname, realization)

        alq_type = ALQ.UNDEFINED
        if pa_table.schema.metadata[b"ALQ_TYPE"].decode("utf-8") != "''":
            alq_type = ALQ[pa_table.schema.metadata[b"ALQ_TYPE"].decode("utf-8")]

        flow_rate_values = np.frombuffer(pa_table.schema.metadata[b"FLOW_VALUES"], dtype=np.float64)
        thp_values = np.frombuffer(pa_table.schema.metadata[b"THP_VALUES"], dtype=np.float64)
        wfr_values = np.frombuffer(pa_table.schema.metadata[b"WFR_VALUES"], dtype=np.float64)
        gfr_values = np.frombuffer(pa_table.schema.metadata[b"GFR_VALUES"], dtype=np.float64)
        alq_values = np.frombuffer(pa_table.schema.metadata[b"ALQ_VALUES"], dtype=np.float64)

        vfp_table = VfpTable(
            vfp_type=VfpType[pa_table.schema.metadata[b"VFP_TYPE"].decode("utf-8")],
            table_number=int(pa_table.schema.metadata[b"TABLE_NUMBER"].decode("utf-8")),
            datum=float(pa_table.schema.metadata[b"DATUM"].decode("utf-8")),
            wfr_type=WFR[pa_table.schema.metadata[b"WFR_TYPE"].decode("utf-8")],
            gfr_type=GFR[pa_table.schema.metadata[b"GFR_TYPE"].decode("utf-8")],
            alq_type=alq_type,
            flow_rate_type=FlowRateType[pa_table.schema.metadata[b"RATE_TYPE"].decode("utf-8")],
            unit_type=UnitType[pa_table.schema.metadata[b"UNIT_TYPE"].decode("utf-8")],
            tab_type=TabType[pa_table.schema.metadata[b"TAB_TYPE"].decode("utf-8")],
            thp_values=thp_values,
            wfr_values=wfr_values,
            gfr_values=gfr_values,
            alq_values=alq_values,
            flow_rate_values=flow_rate_values,
            bhp_table=np.array(pa_table.columns)
            .reshape(len(thp_values), len(wfr_values), len(gfr_values), len(alq_values), len(flow_rate_values))
            .tolist(),
        )
        return vfp_table
