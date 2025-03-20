import logging
from typing import List
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
    smda_well_uuid: str
    eclipse_well_name: str


class ProductionDataAssembler:
    """ """

    def __init__(self, field_identifier: str, summary_access: SummaryAccess, smda_access: SmdaAccess):
        self._field_identifier = field_identifier
        self._summary_access = summary_access
        self._smda_access = smda_access

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


def _eclipse_well_name_to_smda_well(
    eclipse_well_name: str, smda_wellbore_headers: List[WellboreHeader]
) -> WellIdentifier:
    ...
