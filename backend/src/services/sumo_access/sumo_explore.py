from typing import List
from pydantic import BaseModel

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from ._helpers import create_sumo_client_instance


class CaseInfo(BaseModel):
    uuid: str
    name: str


class IterationInfo(BaseModel):
    name: str


class SumoExplore:
    def __init__(self, access_token: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)

    def get_cases(self, field_identifier: str) -> List[CaseInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(field=field_identifier)

        case_info_arr: List[CaseInfo] = []
        for case in case_collection:
            case_info_arr.append(CaseInfo(uuid=case.uuid, name=case.name))

        # Sort on case name before returning
        case_info_arr.sort(key=lambda case_info: case_info.name)

        return case_info_arr

    def get_iterations(self, case_uuid: str) -> List[IterationInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(uuid=case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"Sumo case not found {case_uuid=}")

        case = case_collection[0]
        iter_info_arr: List[IterationInfo] = [
            IterationInfo(name=iteration.get("name")) for iteration in case.iterations
        ]

        # Sort on iteration name before returning
        iter_info_arr.sort(key=lambda iter_info: iter_info.name)

        return iter_info_arr
