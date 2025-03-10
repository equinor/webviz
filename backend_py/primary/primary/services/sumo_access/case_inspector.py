import logging
import asyncio
from pydantic import BaseModel
from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects import Case, SearchContext

from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from primary.services.service_exceptions import (
    Service,
    NoDataError,
    MultipleDataMatchesError,
)

from ._helpers import create_sumo_case_async
from .sumo_client_factory import create_sumo_client


LOGGER = logging.getLogger(__name__)


class IterationInfo(BaseModel):
    name: str
    realization_count: int


class CaseInspector:
    def __init__(self, sumo_client: SumoClient, case_uuid: str):
        self._sumo_client = sumo_client
        self._case_uuid = case_uuid
        self._cached_case_context: Case | None = None

    @classmethod
    def from_case_uuid(cls, access_token: str, case_uuid: str) -> "CaseInspector":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return CaseInspector(sumo_client=sumo_client, case_uuid=case_uuid)

    async def _get_or_create_case_context(self) -> Case:
        if self._cached_case_context is None:
            self._cached_case_context = await create_sumo_case_async(
                client=self._sumo_client, case_uuid=self._case_uuid
            )

        return self._cached_case_context

    async def get_case_name_async(self) -> str:
        """Get name of the case"""
        case: Case = await self._get_or_create_case_context()
        return case.name

    async def _get_iteration_info(self, iteration_uuid: str) -> IterationInfo:
        search_context = SearchContext(self._sumo_client)
        iteration = await search_context.get_iteration_by_uuid_async(iteration_uuid)
        realization_count = len(await iteration.realizations_async)
        return IterationInfo(name=iteration.name, realization_count=realization_count)

    async def get_iterations_async(self) -> list[IterationInfo]:
        """Get list of iterations for a case"""
        timer = PerfMetrics()
        case: Case = await self._get_or_create_case_context()
        timer.record_lap("get_case_obj")
        iterations = await case.iterations_async
        iteration_uuids = iterations.uuids
        timer.record_lap("get_iteration uuids")

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(self._get_iteration_info(iteration_uuid)) for iteration_uuid in iteration_uuids]

        iter_info_arr: list[IterationInfo] = [task.result() for task in tasks]

        # Sort on iteration name before returning
        iter_info_arr.sort(key=lambda iter_info: iter_info.name)
        timer.record_lap("create_iteration_info")

        LOGGER.debug(f"get_iterations_async {timer.to_string()}")
        return iter_info_arr

    async def get_realizations_in_iteration_async(self, iteration_name: str) -> list[int]:
        """Get list of realizations for the specified iteration"""
        timer = PerfMetrics()
        case: Case = await self._get_or_create_case_context()

        ensemble = case.filter(iteration=iteration_name, realization=True)
        realization_list = await ensemble.get_field_values_async("fmu.realization.id")
        timer.record_lap("get_realizations")

        LOGGER.debug(f"get_realizations_in_iteration_async {timer.to_string()}")
        return sorted([int(real) for real in realization_list])

    async def get_stratigraphic_column_identifier_async(self) -> str:
        """Retrieve the stratigraphic column identifier for a case"""
        case: Case = await self._get_or_create_case_context()
        strat_identifier = await case.get_field_values_async("masterdata.smda.stratigraphic_column.identifier.keyword")
        if len(strat_identifier) == 0:
            raise NoDataError(f"No stratigraphic column identifier found for {case.name}", Service.SUMO)
        if len(strat_identifier) > 1:
            raise MultipleDataMatchesError(
                f"Multiple stratigraphic column identifiers found for {case.name}", Service.SUMO
            )
        return strat_identifier[0]

    async def get_field_identifiers_async(self) -> list[str]:
        """Retrieve the field identifiers for a case"""
        case: Case = await self._get_or_create_case_context()
        field_identifiers = await case.get_field_values_async("masterdata.smda.field.identifier.keyword")
        return field_identifiers
