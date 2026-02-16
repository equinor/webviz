import logging

import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from webviz_core_utils.perf_timer import PerfTimer
from webviz_services.service_exceptions import InvalidDataError, ServiceLayerException, Service

from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client


LOGGER = logging.getLogger(__name__)


class GroupTreeAccess:
    """
    Class for accessing and retrieving group tree data
    """

    TAGNAME = "gruptree"

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "GroupTreeAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_group_tree_table_for_realization_async(self, realization: int) -> pa.Table:
        """Get well group tree data for case and ensemble"""
        timer = PerfTimer()

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_tagname(GroupTreeAccess.TAGNAME)

        try:
            pa_table: pa.Table = await table_loader.get_single_realization_async(realization)
        except ServiceLayerException as e:
            enhanced_message = f"Failed to load group tree table data for case '{self._case_uuid}', ensemble '{self._ensemble_name}', realization '{realization}': {e.message}"
            raise type(e)(enhanced_message, e.service) from e

        _validate_group_tree_table(pa_table)

        LOGGER.debug(f"Loaded gruptree table from Sumo in: {timer.elapsed_ms()}ms")
        return pa_table


def _validate_group_tree_table(df: pa.Table) -> None:
    expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}
    if not expected_columns.issubset(df.column_names):
        raise InvalidDataError(f"Expected columns: {expected_columns} - got: {df.column_names}", Service.SUMO)
