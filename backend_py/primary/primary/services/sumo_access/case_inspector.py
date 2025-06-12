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


class IterationTimestamps(BaseModel):
    case_updated_at: str
    data_updated_at: str


class IterationInfo(BaseModel):
    name: str
    realization_count: int
    timestamps: IterationTimestamps


class CaseInspector:
    def __init__(self, sumo_client: SumoClient, case_uuid: str):
        self._sumo_client = sumo_client
        self._case_uuid = case_uuid
        self._cached_case_context: Case | None = None

    @classmethod
    def from_case_uuid(cls, access_token: str, case_uuid: str) -> "CaseInspector":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return CaseInspector(sumo_client=sumo_client, case_uuid=case_uuid)

    async def _get_or_create_case_context_async(self) -> Case:
        if self._cached_case_context is None:
            self._cached_case_context = await create_sumo_case_async(
                client=self._sumo_client, case_uuid=self._case_uuid
            )

        return self._cached_case_context

    async def get_case_updated_timestamp_async(self) -> str:
        case = await self._get_or_create_case_context_async()
        return case.metadata["_sumo"]["timestamp"]

    async def get_last_data_change_timestamp_async(self, iteration_name: str | None = None) -> str:
        timer = PerfMetrics()
        case_context = await self._get_or_create_case_context_async()

        # TODO: Figure out how to set the aggregation up properly. This one works, but uses private methods
        # use this?
        # agg = await search_context.aggregate_async(operation="max")
        # use 'metrics.aggregate_async'; but it's not available at the moment
        search_context = SearchContext(self._sumo_client).filter(
            uuid=case_context.uuid, iteration=iteration_name, realization=True
        )

        payload = {"query": search_context._query, "aggs": {"agg": {"max": {"field": "_sumo.timestamp"}}}, "size": 0}

        res = await search_context._sumo.post_async("/search", json=payload)
        timer.record_lap("aggregate_data_timestamps")

        LOGGER.debug(f"get_last_data_change_timestamp_async {timer.to_string()}")

        return res.json()["aggregations"]["agg"]["value_as_string"]

    async def get_iteration_timestamps_async(self, iteration_name: str) -> IterationTimestamps:
        # case = await self._get_or_create_case_context_async()

        case_updated_at = await self.get_case_updated_timestamp_async()
        data_updated_at = await self.get_last_data_change_timestamp_async(iteration_name)

        return IterationTimestamps(case_updated_at=case_updated_at, data_updated_at=data_updated_at)

    async def get_case_name_async(self) -> str:
        """Get name of the case"""
        case = await self._get_or_create_case_context_async()
        return case.name

    async def _get_iteration_info_async(self, iteration_uuid: str) -> IterationInfo:
        search_context = SearchContext(self._sumo_client)
        iteration = await search_context.get_iteration_by_uuid_async(iteration_uuid)
        realization_count = len(await iteration.realizations_async)
        iteration_timestamps = await self.get_iteration_timestamps_async(iteration.name)

        return IterationInfo(name=iteration.name, realization_count=realization_count, timestamps=iteration_timestamps)

    async def get_iterations_async(self) -> list[IterationInfo]:
        """Get list of iterations for a case"""
        timer = PerfMetrics()
        case = await self._get_or_create_case_context_async()
        timer.record_lap("get_case_obj")
        iterations = await case.iterations_async
        iteration_uuids = iterations.uuids
        timer.record_lap("get_iteration uuids")

        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(self._get_iteration_info_async(iteration_uuid)) for iteration_uuid in iteration_uuids
            ]

        iter_info_arr: list[IterationInfo] = [task.result() for task in tasks]

        # Sort on iteration name before returning
        iter_info_arr.sort(key=lambda iter_info: iter_info.name)
        timer.record_lap("create_iteration_info")

        LOGGER.debug(f"get_iterations_async {timer.to_string()}")
        return iter_info_arr

    async def get_realizations_in_iteration_async(self, iteration_name: str) -> list[int]:
        """Get list of realizations for the specified iteration"""
        timer = PerfMetrics()
        case = await self._get_or_create_case_context_async()

        ensemble = case.filter(iteration=iteration_name, realization=True)
        realization_list = await ensemble.realizationids_async
        timer.record_lap("get_realizations")

        LOGGER.debug(f"get_realizations_in_iteration_async {timer.to_string()}")
        return sorted([int(real) for real in realization_list])

    async def get_stratigraphic_column_identifier_async(self) -> str:
        """Retrieve the stratigraphic column identifier for a case"""
        case = await self._get_or_create_case_context_async()
        strat_identifier = await case.stratcolumnidentifiers_async
        if len(strat_identifier) == 0:
            raise NoDataError(f"No stratigraphic column identifier found for {case.name}", Service.SUMO)
        if len(strat_identifier) > 1:
            raise MultipleDataMatchesError(
                f"Multiple stratigraphic column identifiers found for {case.name}", Service.SUMO
            )
        return strat_identifier[0]

    async def get_field_identifiers_async(self) -> list[str]:
        """Retrieve the field identifiers for a case"""
        case = await self._get_or_create_case_context_async()
        field_identifiers = await case.fieldidentifiers_async
        return field_identifiers
