import logging
from typing import List

import numpy as np
import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from primary.services.service_exceptions import NoDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client
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

    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "VfpAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_all_vfp_table_names_for_realization_async(self, realization: int) -> List[str]:
        """Returns all VFP table names/tagnames for a realization."""
        table_context = self._ensemble_context.tables.filter(
            content="lift_curves", realization=realization, iteration=self._iteration_name
        )
        table_count = await table_context.length_async()
        if table_count == 0:
            raise NoDataError(f"No VFP tables found for realization: {realization}", Service.SUMO)
        tagnames = await table_context.tagnames_async

        return tagnames

    async def get_vfp_table_from_tagname_as_pyarrow_async(self, tagname: str, realization: int) -> pa.Table:
        """Returns a VFP table as a pyarrow table for a specific tagname (table name)
        and realization.
        """

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_tagname(tagname)
        pa_table = await table_loader.get_single_realization_async(realization)

        return pa_table

    async def get_vfp_table_from_tagname_async(self, tagname: str, realization: int) -> VfpProdTable | VfpInjTable:
        """Returns a VFP table as a VFP table object for a specific tagname (table name)
        and realization.

        If the VFP table type is VFPINJ then a VfpInjTable object is returned.
        If the VFP table type is VFPPROD then a VfpProdTable object is returned
        """

        pa_table = await self.get_vfp_table_from_tagname_as_pyarrow_async(tagname, realization)

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
