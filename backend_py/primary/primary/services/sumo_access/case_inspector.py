from pydantic import BaseModel

from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects import Case

from ._helpers import create_sumo_case_async
from .queries.case import get_stratigraphic_column_identifier_async, get_field_identifiers_async
from .sumo_client_factory import create_sumo_client


class IterationInfo(BaseModel):
    name: str
    realization_count: int


class CaseInspector:
    def __init__(self, sumo_client: SumoClient, case_uuid: str):
        self._sumo_client = sumo_client
        self._case_uuid = case_uuid
        self._cached_case_obj: Case | None = None

    @classmethod
    def from_case_uuid(cls, access_token: str, case_uuid: str) -> "CaseInspector":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return CaseInspector(sumo_client=sumo_client, case_uuid=case_uuid)

    async def _get_or_create_case_obj_async_async(self) -> Case:
        if not self._cached_case_obj:
            self._cached_case_obj = await create_sumo_case_async(
                client=self._sumo_client, case_uuid=self._case_uuid, want_keepalive_pit=False
            )

        return self._cached_case_obj

    async def get_case_name_async(self) -> str:
        """Get name of the case"""
        case: Case = await self._get_or_create_case_obj_async_async()
        return case.name

    async def get_iterations_async(self) -> list[IterationInfo]:
        case: Case = await self._get_or_create_case_obj_async_async()

        # Until we update fmu-sumo > 2.0 we need to fetch iterations synchronously.
        iterations = case.iterations

        iter_info_arr: list[IterationInfo] = []
        for iteration in iterations:
            iter_info_arr.append(
                IterationInfo(name=iteration.get("name"), realization_count=iteration.get("realizations"))
            )

        # Sort on iteration name before returning
        iter_info_arr.sort(key=lambda iter_info: iter_info.name)

        return iter_info_arr

    async def get_realizations_in_iteration_async(self, iteration_name: str) -> list[int]:
        """Get list of realizations for the specified iteration"""
        case: Case = await self._get_or_create_case_obj_async_async()
        realization_list = await case.get_realizations_async(iteration_name)
        return sorted([int(real) for real in realization_list])

    async def get_stratigraphic_column_identifier_async(self) -> str:
        """Retrieve the stratigraphic column identifier for a case"""
        return await get_stratigraphic_column_identifier_async(self._sumo_client, self._case_uuid)

    async def get_field_identifiers_async(self) -> list[str]:
        """Retrieve the field identifiers for a case"""
        return await get_field_identifiers_async(self._sumo_client, self._case_uuid)
