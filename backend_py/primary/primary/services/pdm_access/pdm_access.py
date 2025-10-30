import logging

from .types import WellProductionData, WellInjectionData, PRODCOLUMNS, INJCOLUMNS
from ._pdm_get_request import pdm_get_request_async
from .utils.calculate_totals_from_daily import (
    calculate_total_production_from_daily,
    calculate_total_injection_from_daily,
)

LOGGER = logging.getLogger(__name__)


class PDMEndpoints:
    WELL_PROD_DAY = "flex/WellBoreProdDayCompact"
    WELL_INJ_DAY = "flex/WellBoreInjDayCompact"


class PDMAccess:
    def __init__(self, access_token: str):
        self._pdm_token = access_token

    async def _pdm_get_request_async(self, endpoint: str, params: dict) -> list[dict]:
        return await pdm_get_request_async(access_token=self._pdm_token, endpoint=endpoint, params=params)

    async def get_per_well_production_in_time_interval_async(
        self,
        field_identifier: str,
        start_date: str,
        end_date: str,
    ) -> list[WellProductionData]:
        params = {
            "GOV_FIELD_NAME": field_identifier,
            "PROD_DAY": f"RANGE({start_date} | {end_date})",
            "TOP": "ALL",
            "COLUMNS": ",".join(PRODCOLUMNS),
        }
        results = await self._pdm_get_request_async(endpoint=PDMEndpoints.WELL_PROD_DAY, params=params)

        if not results:
            return []

        return calculate_total_production_from_daily(results, start_date=start_date, end_date=end_date)

    async def get_per_well_injection_in_time_interval_async(
        self,
        field_identifier: str,
        start_date: str,
        end_date: str,
    ) -> list[WellInjectionData]:
        params = {
            "GOV_FIELD_NAME": field_identifier,
            "PROD_DAY": f"RANGE({start_date} | {end_date})",
            "TOP": "ALL",
            "COLUMNS": ",".join(INJCOLUMNS),
        }
        results = await self._pdm_get_request_async(endpoint=PDMEndpoints.WELL_INJ_DAY, params=params)
        if not results:
            return []
        return calculate_total_injection_from_daily(results, start_date=start_date, end_date=end_date)
