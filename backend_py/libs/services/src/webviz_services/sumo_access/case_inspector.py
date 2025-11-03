import logging
import asyncio
from pydantic import BaseModel
from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects import Case, SearchContext

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import (
    Service,
    NoDataError,
    MultipleDataMatchesError,
)

from ._helpers import create_sumo_case_async
from .sumo_client_factory import create_sumo_client


LOGGER = logging.getLogger(__name__)


class EnsembleInfo(BaseModel):
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

    async def _get_or_create_case_context_async(self) -> Case:
        if self._cached_case_context is None:
            self._cached_case_context = await create_sumo_case_async(
                client=self._sumo_client, case_uuid=self._case_uuid
            )

        return self._cached_case_context

    async def get_case_name_async(self) -> str:
        """Get name of the case"""
        case = await self._get_or_create_case_context_async()
        return case.name

    async def _get_ensemble_info_async(self, ensemble_uuid: str) -> EnsembleInfo:
        search_context = SearchContext(self._sumo_client)
        ensemble_obj = await search_context.get_ensemble_by_uuid_async(ensemble_uuid)
        realization_count = len(await ensemble_obj.realizations_async)

        return EnsembleInfo(name=ensemble_obj.name, realization_count=realization_count)

    async def get_ensembles_async(self) -> list[EnsembleInfo]:
        """Get list of ensembles for a case"""
        timer = PerfMetrics()
        case = await self._get_or_create_case_context_async()
        timer.record_lap("get_case_obj")
        ensembles = await case.ensembles_async
        ensemble_uuids = ensembles.uuids
        timer.record_lap("get_ensemble_uuids")

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(self._get_ensemble_info_async(ens_uuid)) for ens_uuid in ensemble_uuids]

        ens_info_arr: list[EnsembleInfo] = [task.result() for task in tasks]

        # Sort on ensemble name before returning
        ens_info_arr.sort(key=lambda ens_info: ens_info.name)
        timer.record_lap("create_ensemble_info")

        LOGGER.debug(f"get_ensembles_async {timer.to_string()}")
        return ens_info_arr

    async def get_realizations_in_ensemble_async(self, ensemble_name: str) -> list[int]:
        """Get list of realizations for the specified ensemble"""
        timer = PerfMetrics()
        case = await self._get_or_create_case_context_async()

        ensemble = case.filter(ensemble=ensemble_name, realization=True)
        realization_list = await ensemble.realizationids_async
        timer.record_lap("get_realizations")

        LOGGER.debug(f"get_realizations_in_ensemble_async {timer.to_string()}")
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

    async def get_standard_results_in_ensemble_async(self, ensemble_name: str) -> list[str]:
        """Retrieve the standard results for a specific ensemble"""
        case = await self._get_or_create_case_context_async()
        ensemble = case.filter(ensemble=ensemble_name)
        standard_results = await ensemble.standard_results_async
        return standard_results
