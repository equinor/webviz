import logging
from typing import List

import numpy as np
import pyarrow as pa
from fmu.sumo.explorer.objects import Case
from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service

from ._helpers import create_sumo_case_async, create_sumo_client
from .vfp_types import (
    ALQ,
    GFR,
    WFR,
    FlowRateType,
    TabType,
    UnitType,
    VfpProdTable,
    VfpInjTable,
    VfpType,
    VfpParam,
    VFP_UNITS,
    THP,
)

LOGGER = logging.getLogger(__name__)


class VfpAccess:
    """
    Class for accessing and retrieving Vfp tables
    """

    def __init__(self, case: Case, iteration_name: str):
        self._case = case
        self._iteration_name = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "VfpAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(sumo_client, case_uuid, want_keepalive_pit=False)
        return VfpAccess(case, iteration_name)

    async def get_all_vfp_table_names_for_realization(self, realization: int) -> List[str]:
        """Returns all VFP table names/tagnames for a realization."""
        table_collection = self._case.tables.filter(
            content="lift_curves", realization=realization, iteration=self._iteration_name
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
            raise MultipleDataMatchesError(
                f"Multiple VFP tables found with tagname: {tagname} and realization: {realization}", Service.SUMO
            )

        pa_table: pa.Table = await table_collection[0].to_arrow_async()

        return pa_table

    async def get_vfp_table_from_tagname(self, tagname: str, realization: int) -> VfpProdTable | VfpInjTable:
        """Returns a VFP table as a VFP table object for a specific tagname (table name)
        and realization.

        If the VFP table type is VFPINJ then a VfpInjTable object is returned.
        If the VFP table type is VFPPROD then a VfpProdTable object is returned
        """

        pa_table = await self.get_vfp_table_from_tagname_as_pyarrow(tagname, realization)

        # Extracting data valid for both VFPPROD and VFPINJ
        vfp_type = VfpType[pa_table.schema.metadata[b"VFP_TYPE"].decode("utf-8")]
        unit_type = UnitType[pa_table.schema.metadata[b"UNIT_TYPE"].decode("utf-8")]
        thp_type = THP[pa_table.schema.metadata[b"THP_TYPE"].decode("utf-8")]
        flow_rate_type = FlowRateType[pa_table.schema.metadata[b"RATE_TYPE"].decode("utf-8")]
        table_number = int(pa_table.schema.metadata[b"TABLE_NUMBER"].decode("utf-8"))
        datum = float(pa_table.schema.metadata[b"DATUM"].decode("utf-8"))
        tab_type = TabType[pa_table.schema.metadata[b"TAB_TYPE"].decode("utf-8")]
        thp_values = np.frombuffer(pa_table.schema.metadata[b"THP_VALUES"], dtype=np.float64).tolist()
        flow_rate_values = np.frombuffer(pa_table.schema.metadata[b"FLOW_VALUES"], dtype=np.float64).tolist()

        if vfp_type == VfpType.VFPINJ:
            return VfpInjTable(
                table_number=table_number,
                datum=datum,
                flow_rate_type=flow_rate_type,
                unit_type=unit_type,
                tab_type=tab_type,
                thp_values=thp_values,
                flow_rate_values=flow_rate_values,
                bhp_values=[val for sublist in np.array(pa_table.columns).tolist() for val in sublist],
                flow_rate_unit=VFP_UNITS[unit_type][VfpParam.FLOWRATE][flow_rate_type],
                thp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
                bhp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
            )

        if vfp_type == VfpType.VFPPROD:
            # Extracting additional data valid only for VFPPROD
            alq_type = ALQ.UNDEFINED
            if pa_table.schema.metadata[b"ALQ_TYPE"].decode("utf-8") != "''":
                alq_type = ALQ[pa_table.schema.metadata[b"ALQ_TYPE"].decode("utf-8")]
            wfr_type = WFR[pa_table.schema.metadata[b"WFR_TYPE"].decode("utf-8")]
            gfr_type = GFR[pa_table.schema.metadata[b"GFR_TYPE"].decode("utf-8")]
            wfr_values = np.frombuffer(pa_table.schema.metadata[b"WFR_VALUES"], dtype=np.float64).tolist()
            gfr_values = np.frombuffer(pa_table.schema.metadata[b"GFR_VALUES"], dtype=np.float64).tolist()
            alq_values = np.frombuffer(pa_table.schema.metadata[b"ALQ_VALUES"], dtype=np.float64).tolist()

            return VfpProdTable(
                table_number=table_number,
                datum=datum,
                thp_type=thp_type,
                wfr_type=wfr_type,
                gfr_type=gfr_type,
                alq_type=alq_type,
                flow_rate_type=flow_rate_type,
                unit_type=unit_type,
                tab_type=tab_type,
                thp_values=thp_values,
                wfr_values=wfr_values,
                gfr_values=gfr_values,
                alq_values=alq_values,
                flow_rate_values=flow_rate_values,
                bhp_values=[val for sublist in np.array(pa_table.columns).tolist() for val in sublist],
                flow_rate_unit=VFP_UNITS[unit_type][VfpParam.FLOWRATE][flow_rate_type],
                thp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
                wfr_unit=VFP_UNITS[unit_type][VfpParam.WFR][wfr_type],
                gfr_unit=VFP_UNITS[unit_type][VfpParam.GFR][gfr_type],
                alq_unit=VFP_UNITS[unit_type][VfpParam.ALQ][alq_type],
                bhp_unit=VFP_UNITS[unit_type][VfpParam.THP][thp_type],
            )

        raise ValueError(f"VfpType {vfp_type} not implemented.")
