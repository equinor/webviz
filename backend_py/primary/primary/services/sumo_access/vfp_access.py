import logging
from typing import Optional, List
from io import BytesIO

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import numpy as np
from fmu.sumo.explorer.objects import Case

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client, create_sumo_case_async
from .vfp_types import VfpType, FlowRateType, WFR, GFR, ALQ, UnitType, TabType, VfpTable

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

    async def get_all_vfp_tables_for_realization() -> List[str]:
        return [name for name in self._case.tables.tagnames if name.startswith("VFP")]

    async def get_vfp_table_from_tagname_as_pyarrow(tagname: str) -> pa.Table:
        table_collection = self._case.tables.filter(
            tagname=tagname, realization=realization, iteration=self._iteration_name
        )
        sumo_table = table_collection[0]
        byte_stream: BytesIO = await sumo_table.blob_async
        pa_table: pa.Table = pq.read_table(byte_stream)

        return pa_table

    async def get_vfp_table_from_tagname(tagname: str) -> VfpTable:
        pa_table = get_vfp_table_from_tagname_as_pyarrow(tagname)

        alq_type = ALQ.UNDEFINED
        if pa_table.schema.metadata[b"ALQ_TYPE"].decode("utf-8") != "''":
            alq_type = ALQ[pa_table.schema.metadata[b"ALQ_TYPE"].decode("utf-8")]

        flow_rate_values=np.frombuffer(pa_table.schema.metadata[b"FLOW_VALUES"], dtype=np.float64)
        thp_values=np.frombuffer(pa_table.schema.metadata[b"THP_VALUES"], dtype=np.float64)
        wfr_values=np.frombuffer(pa_table.schema.metadata[b"WFR_VALUES"], dtype=np.float64)
        gfr_values=np.frombuffer(pa_table.schema.metadata[b"GFR_VALUES"], dtype=np.float64)
        alq_values=np.frombuffer(pa_table.schema.metadata[b"ALQ_VALUES"], dtype=np.float64)

        vfp_table = VfpTable(
            vfp_type=VfpType[pa_table.schema.metadata[b"VFP_TYPE"].decode("utf-8")],
            table_number=int(pa_table.schema.metadata[b"TABLE_NUMBER"].decode("utf-8")),
            datum=float(pa_table.schema.metadata[b"DATUM"].decode("utf-8")),
            flow_rate_type=FlowRateType[pa_table.schema.metadata[b"RATE_TYPE"].decode("utf-8")],
            wfr_type=WFR[pa_table.schema.metadata[b"WFR_TYPE"].decode("utf-8")],
            gfr_type=GFR[pa_table.schema.metadata[b"GFR_TYPE"].decode("utf-8")],
            alq_type=alq_type,
            unit_type=UnitType[pa_table.schema.metadata[b"UNIT_TYPE"].decode("utf-8")],
            tab_type=TabType[pa_table.schema.metadata[b"TAB_TYPE"].decode("utf-8")],
            flow_rate_values=flow_rate_values,
            thp_values=thp_values,
            wfr_values=wfr_values,
            gfr_values=gfr_values,
            alq_values=alq_values,
            bhp_table=np.array(pa_table.columns).reshape(
                len(thp_values), len(wfr_values), len(gfr_values), len(alq_values), len(flow_rate_values)
            ).tolist()

        )
        return vfp_table