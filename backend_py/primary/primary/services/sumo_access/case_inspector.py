from pydantic import BaseModel

from fmu.sumo.explorer.explorer import SumoClient
from fmu.sumo.explorer.objects import Case

from .queries.case import get_stratigraphic_column_identifier, get_field_identifiers

from ._helpers import create_sumo_client, create_sumo_case_async


class IterationInfo(BaseModel):
    name: str
    realization_count: int


class CaseInspector:
    def __init__(self, sumo_client: SumoClient, case: Case, case_uuid: str):
        self._sumo_client = sumo_client
        self._case = case
        self._case_uuid = case_uuid

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str) -> "CaseInspector":
        sumo_client: SumoClient = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return CaseInspector(sumo_client=sumo_client, case=case, case_uuid=case_uuid)

    def get_case_name(self) -> str:
        """Get name of the case"""
        return self._case.name

    async def get_iterations_async(self) -> list[IterationInfo]:
        iterations = await self._case.iterations_async

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
        realization_list = await self._case.get_realizations_async(iteration_name)
        return sorted([int(real) for real in realization_list])

    async def get_stratigraphic_column_identifier_async(self) -> str:
        """Retrieve the stratigraphic column identifier for a case"""
        return await get_stratigraphic_column_identifier(self._sumo_client, self._case_uuid)

    async def get_field_identifiers_async(self) -> list[str]:
        """Retrieve the field identifiers for a case"""
        return await get_field_identifiers(self._sumo_client, self._case_uuid)
