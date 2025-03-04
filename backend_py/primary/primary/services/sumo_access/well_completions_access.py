import asyncio
import pyarrow as pa
from fmu.sumo.explorer.objects import Case
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from primary.services.service_exceptions import InvalidDataError, MultipleDataMatchesError, Service, NoDataError


from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client


class WellCompletionsAccess:
    """
    Class for accessing and retrieving well completions data
    """

    TAGNAME = "wellcompletiondata"

    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "WellCompletionsAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_well_completions_single_realization_table_async(self, realization: int) -> pa.Table | None:
        """Get well completions table for single realization"""

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_tagname(WellCompletionsAccess.TAGNAME)

        pa_table: pa.Table = await table_loader.get_single_realization_async(realization)

        return pa_table

    async def get_well_completions_table_async(self) -> pa.Table:
        """Get assembled well completions table for multiple realizations, i.e. assemble from collection into single table

        Expected table columns: ["WELL", "DATE", "ZONE", "REAL", "OP/SH", "KH"]
        """
        index_columns = ["WELL", "DATE", "ZONE", "REAL"]

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_tagname(WellCompletionsAccess.TAGNAME)
        table: pa.Table = await table_loader.get_aggregated_multiple_columns_async(["OP/SH", "KH"])

        expected_columns = ["OP/SH", "KH"] + index_columns

        if not set(expected_columns).issubset(table.column_names):
            raise InvalidDataError(
                f"Missing expected columns: {expected_columns} in the well completions table",
                Service.SUMO,
            )
        return table
