from typing import List
from pydantic import BaseModel

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from ._helpers import create_sumo_client_instance
from ._helpers import encode_iteration_pseudo_uuid, IterSpec


class CaseInfo(BaseModel):
    uuid: str
    name: str

class IterationInfo(BaseModel):
    pseudo_uuid: str
    name: str


class SumoExplore:
    def __init__(self, access_token: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)

    def get_cases(self, field_identifier: str) -> List[CaseInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(field=field_identifier)

        case_info_arr: List[CaseInfo] = []
        for case in case_collection:
            case_info_arr.append(CaseInfo(uuid=case.id, name=case.name))

        return case_info_arr

    def get_iterations(self, case_uuid: str) -> List[IterationInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(id=case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"Sumo case not found {case_uuid=}")

        case = case_collection[0]
        iterations = case.iterations
        iter_info_arr: List[IterationInfo] = []
        for it in iterations:
            iteration_id = it.get("id")
            iteration_name = it.get("name")
            iteration_addr = IterSpec(case_uuid=case_uuid, iteration_id=iteration_id, iteration_name=iteration_name)
            pseudo_iteration_uuid = encode_iteration_pseudo_uuid(iteration_addr)
            iter_info_arr.append(IterationInfo(pseudo_uuid=pseudo_iteration_uuid, name=iteration_name))

        return iter_info_arr
