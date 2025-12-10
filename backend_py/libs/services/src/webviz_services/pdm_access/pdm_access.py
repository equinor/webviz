import logging
from datetime import datetime, timedelta

from .types import WellProductionData, WellInjectionData
from ._internal_types import _PDMEndpoints, _PRODCOLUMNS, _INJCOLUMNS

from ._pdm_get_request import pdm_get_request_async
from ._calculate_totals_from_daily import (
    calculate_total_production_from_daily,
    calculate_total_injection_from_daily,
)

LOGGER = logging.getLogger(__name__)


def _get_query_date_range(
    start_date: str, end_date: str, start_date_inclusive: bool, end_date_inclusive: bool
) -> tuple[str, str]:
    """Get the start and end dates for the query range.

    The RANGE filter is inclusive on both ends.
    If start_date_inclusive is False, add one day to exclude the start date from results.
    If end_date_inclusive is False, subtract one day to exclude the end date from results.
    """

    # Extract only the date part (yyyy-mm-dd) in case time is included
    query_start_date = start_date[:10]
    query_end_date = end_date[:10]

    if not start_date_inclusive:
        date = datetime.strptime(query_start_date, "%Y-%m-%d")
        query_start_date = (date + timedelta(days=1)).strftime("%Y-%m-%d")

    if not end_date_inclusive:
        date = datetime.strptime(query_end_date, "%Y-%m-%d")
        query_end_date = (date - timedelta(days=1)).strftime("%Y-%m-%d")

    return query_start_date, query_end_date


class PDMAccess:
    def __init__(self, access_token: str):
        self._pdm_token = access_token

    async def get_per_well_total_production_in_time_interval_async(
        self,
        field_identifier: str,
        start_date: str,
        end_date: str,
        start_date_inclusive: bool = True,
        end_date_inclusive: bool = False,
    ) -> list[WellProductionData]:
        """Get total production per well for a given time interval.

        Args:
            field_identifier: The field name to query (GOV_FIELD_NAME).
            start_date: Start date in yyyy-mm-dd format.
            end_date: End date in yyyy-mm-dd format.
            start_date_inclusive: If True, include the start date in the range. Defaults to True.
            end_date_inclusive: If True, include the end date in the range. Defaults to False.

        Returns:
            List of WellProductionData with summed oil, gas, and water production per well.
        """
        query_start_date, query_end_date = _get_query_date_range(
            start_date, end_date, start_date_inclusive, end_date_inclusive
        )
        params = {
            "GOV_FIELD_NAME": field_identifier,
            "PROD_DAY": f"RANGE({query_start_date} | {query_end_date})",
            "TOP": "ALL",
            "COLUMNS": ",".join(_PRODCOLUMNS),
        }

        results = await pdm_get_request_async(
            access_token=self._pdm_token, endpoint=_PDMEndpoints.WELL_PROD_DAY, params=params
        )
        if not results:
            return []

        return calculate_total_production_from_daily(results, start_date=start_date, end_date=end_date)

    async def get_per_well_total_injection_in_time_interval_async(
        self,
        field_identifier: str,
        start_date: str,
        end_date: str,
        start_date_inclusive: bool = True,
        end_date_inclusive: bool = False,
    ) -> list[WellInjectionData]:
        """Get total injection per well for a given time interval.

        Args:
            field_identifier: The field name to query (GOV_FIELD_NAME).
            start_date: Start date in yyyy-mm-dd format.
            end_date: End date in yyyy-mm-dd format.
            start_date_inclusive: If True, include the start date in the range. Defaults to True.
            end_date_inclusive: If True, include the end date in the range. Defaults to False.

        Returns:
            List of WellInjectionData with summed water and gas injection per well.
        """
        query_start_date, query_end_date = _get_query_date_range(
            start_date, end_date, start_date_inclusive, end_date_inclusive
        )
        params = {
            "GOV_FIELD_NAME": field_identifier,
            "PROD_DAY": f"RANGE({query_start_date} | {query_end_date})",
            "TOP": "ALL",
            "COLUMNS": ",".join(_INJCOLUMNS),
        }
        results = await pdm_get_request_async(
            access_token=self._pdm_token, endpoint=_PDMEndpoints.WELL_INJ_DAY, params=params
        )
        if not results:
            return []
        return calculate_total_injection_from_daily(results, start_date=start_date, end_date=end_date)
