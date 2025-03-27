from enum import StrEnum
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass

from primary.services.sumo_access.summary_access import SummaryAccess
from primary.services.smda_access import SmdaAccess, WellboreHeader

LOGGER = logging.getLogger(__name__)


@dataclass
class WellFlowData:
    oil_production_volume: float | None
    gas_production_volume: float | None
    water_production_volume: float | None
    water_injection_volume: float | None
    gas_injection_volume: float | None
    co2_injection_volume: float | None
    well_uwi: str
    well_uuid: str
    eclipse_well_name: str


class FlowVector(StrEnum):
    OIL_PRODUCTION = "oil_production"
    GAS_PRODUCTION = "gas_production"
    WATER_PRODUCTION = "water_production"
    WATER_INJECTION = "water_injection"
    GAS_INJECTION = "gas_injection"
    CO2_INJECTION = "co2_injection"


@dataclass
class WellFlowDataInfo:
    flow_vector_arr: List[FlowVector]
    well_uwi: str
    eclipse_well_name: str


flow_vectors_eclipse_mapping = {
    "WOPTH": FlowVector.OIL_PRODUCTION,
    "WGPTH": FlowVector.GAS_PRODUCTION,
    "WWPTH": FlowVector.WATER_PRODUCTION,
}


class WellFlowDataAssembler:
    """ """

    def __init__(self, field_identifier: str, summary_access: SummaryAccess, smda_access: SmdaAccess):
        self._field_identifier = field_identifier
        self._summary_access = summary_access
        self._smda_access = smda_access
        self._smda_uwis: Optional[List[str]] = None

    async def _get_smda_well_uwis_async(self) -> List[str]:
        if self._smda_uwis is None:
            wellbore_headers = await self._smda_access.get_wellbore_headers_async(
                field_identifier=self._field_identifier
            )
            self._smda_uwis = [header.unique_wellbore_identifier for header in wellbore_headers]
        return self._smda_uwis

    async def get_well_flow_data_info_async(
        self,
    ) -> List[WellFlowDataInfo]:
        available_summary_column_names = await self._summary_access.get_all_available_column_names_async()

        smda_uwis = await self._get_smda_well_uwis_async()

        flow_vectors: List[WellFlowDataInfo] = []
        flow_vector_arr_for_well_mapping: Dict[str, List[FlowVector]] = {}

        for eclkey, flowvec in flow_vectors_eclipse_mapping.items():
            matching_columns = [col for col in available_summary_column_names if eclkey in col]
            ecl_well_names = [col.split(":")[1] for col in matching_columns]

            for ecl_well_name in ecl_well_names:
                if ecl_well_name not in flow_vector_arr_for_well_mapping:
                    flow_vector_arr_for_well_mapping[ecl_well_name] = []
                flow_vector_arr_for_well_mapping[ecl_well_name].append(flowvec)

        for ecl_well_name, flow_vector_arr in flow_vector_arr_for_well_mapping.items():
            smda_uwi = _eclipse_well_name_to_smda_uwi(ecl_well_name, smda_uwis)
            flow_vectors.append(
                WellFlowDataInfo(flow_vector_arr=flow_vector_arr, well_uwi=smda_uwi, eclipse_well_name=ecl_well_name)
            )

        return flow_vectors

    async def get_well_flow_data_in_interval_async(
        self,
        realization: int,
        minimum_volume_limit: float,
        start_timestamp_utc_ms: int,
        end_timestamp_utc_ms: int,
    ) -> List[WellFlowData]:

        smry_realization_data = await self._summary_access.get_single_real_full_table_async(realization=realization)
        smda_wellbore_headers = await self._smda_access.get_wellbore_headers_async(
            field_identifier=self._field_identifier
        )
        flow_data: List[WellFlowData] = []
        return flow_data


def _eclipse_well_name_to_smda_uwi(eclipse_well_name: str, smda_uwi_arr: List[str]) -> str:
    well_name = eclipse_well_name.replace("_", "-")
    well_uwi_arr = [uwi for uwi in smda_uwi_arr if well_name in uwi]
    if len(well_uwi_arr) == 1:
        return well_uwi_arr[0]
    else:
        LOGGER.warning(f"Could not find a unique match for well name {well_name} in smda uwis ")
        return eclipse_well_name
