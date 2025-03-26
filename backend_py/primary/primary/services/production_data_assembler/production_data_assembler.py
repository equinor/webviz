from enum import StrEnum
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass

from primary.services.sumo_access.summary_access import SummaryAccess
from primary.services.smda_access import SmdaAccess, WellboreHeader

LOGGER = logging.getLogger(__name__)


@dataclass
class WellProductionData:
    oil_production_volume: float | None
    gas_production_volume: float | None
    water_production_volume: float | None
    water_injection_volume: float | None
    gas_injection_volume: float | None
    co2_injection_volume: float | None
    well_uwi: str
    well_uuid: str
    eclipse_well_name: str


@dataclass
class WellIdentifier:
    smda_well_uwi: str
    eclipse_well_name: str


class FlowVector(StrEnum):
    OIL_PRODUCTION = "oil_production"
    GAS_PRODUCTION = "gas_production"
    WATER_PRODUCTION = "water_production"
    WATER_INJECTION = "water_injection"
    GAS_INJECTION = "gas_injection"
    CO2_INJECTION = "co2_injection"


flow_vectors_eclipse_mapping = {
    FlowVector.OIL_PRODUCTION: "WOPTH",
    FlowVector.GAS_PRODUCTION: "WGPTH",
    FlowVector.WATER_PRODUCTION: "WWPTH",
}


@dataclass
class FlowVectorInfo:
    flow_vector: FlowVector
    well_identifiers: List[WellIdentifier]


class ProductionDataAssembler:
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

    async def get_production_and_injection_info_async(
        self,
    ) -> List[WellProductionData]:
        available_summary_column_names = await self._summary_access.get_all_available_column_names_async()
        well_names_ecl_to_smda_mapping: Dict[str, str] = {}
        smda_uwis = await self._get_smda_well_uwis_async()

        flow_vectors: List[FlowVectorInfo] = []
        well_identifiers: List[WellIdentifier] = []
        for flowvec, eclkey in flow_vectors_eclipse_mapping.items():
            matching_columns = [col for col in available_summary_column_names if eclkey in col]
            ecl_well_names = [col.split(":")[1] for col in matching_columns]
            for ecl_well_name in ecl_well_names:
                if ecl_well_name not in well_names_ecl_to_smda_mapping:
                    well_names_ecl_to_smda_mapping[ecl_well_name] = _eclipse_well_name_to_smda_uwi(
                        ecl_well_name, smda_uwis
                    )
                smda_uwi = well_names_ecl_to_smda_mapping[ecl_well_name]
                well_identifiers.append(WellIdentifier(smda_well_uwi=smda_uwi, eclipse_well_name=ecl_well_name))

            flow_vectors.append(FlowVectorInfo(flow_vector=flowvec, well_identifiers=well_identifiers))
        print(flow_vectors)
        return []

    async def get_production_data_in_interval_async(
        self,
        realization: int,
        minimum_volume_limit: float,
        start_timestamp_utc_ms: int,
        end_timestamp_utc_ms: int,
    ) -> List[WellProductionData]:

        smry_realization_data = await self._summary_access.get_single_real_full_table_async(realization=realization)
        smda_wellbore_headers = await self._smda_access.get_wellbore_headers_async(
            field_identifier=self._field_identifier
        )
        prod_data: List[WellProductionData] = []
        return prod_data


def _eclipse_well_name_to_smda_uwi(eclipse_well_name: str, smda_uwi_arr: List[str]) -> str:
    return eclipse_well_name
