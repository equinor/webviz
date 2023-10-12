from typing import List, Sequence, Tuple

from sumo.wrapper import SumoClient
from fmu.sumo.explorer.objects import CaseCollection, Case

from src import config
from .queries.case import get_stratigraphic_column_identifier, get_field_identifiers


def create_sumo_client_instance(access_token: str) -> SumoClient:
    sumo_client = SumoClient(env=config.SUMO_ENV, token=access_token, interactive=False)
    return sumo_client


async def _init_helper(access_token: str, case_uuid: str) -> Tuple[SumoClient, Case]:
    sumo_client: SumoClient = create_sumo_client_instance(access_token)
    case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)

    if await case_collection.length_async() != 1:
        raise ValueError(f"None or multiple sumo cases found {case_uuid=}")

    case = case_collection[0]

    return sumo_client, case


class SumoCase:
    def __init__(self, sumo_client: SumoClient, case: Case, case_uuid: str):
        self._sumo_client = sumo_client
        self._case = case
        self._case_uuid = case_uuid

    @classmethod
    async def from_case_uuid(cls, access_token: str, case_uuid: str):  # type: ignore # wait on Python 3.11
        sumo_client, case = await _init_helper(access_token, case_uuid)
        return SumoCase(sumo_client=sumo_client, case=case, case_uuid=case_uuid)

    def get_case_name(self) -> str:
        """Get name of the case"""
        return self._case.name

    async def get_stratigraphic_column_identifier(self) -> str:
        """Retrieve the stratigraphic column identifier for a case"""
        return await get_stratigraphic_column_identifier(self._sumo_client, self._case_uuid)

    async def get_field_identifiers(self) -> List[str]:
        """Retrieve the field identifiers for a case"""
        return await get_field_identifiers(self._sumo_client, self._case_uuid)


class SumoEnsemble(SumoCase):
    def __init__(self, sumo_client: SumoClient, case: Case, case_uuid: str, iteration_name: str):
        super().__init__(sumo_client=sumo_client, case=case, case_uuid=case_uuid)
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid(cls, access_token: str, case_uuid: str, iteration_name: str):  # type: ignore # wait on Python 3.11  # pylint: disable=arguments-differ
        sumo_client, case = await _init_helper(access_token, case_uuid)
        return cls(sumo_client=sumo_client, case=case, case_uuid=case_uuid, iteration_name=iteration_name)

    def get_realizations(self) -> Sequence[int]:
        """Get list of realizations for this iteration"""
        realizations = self._case.get_realizations(self._iteration_name)
        return sorted([int(real) for real in realizations])
