from typing import List
from pydantic import BaseModel

from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient

from ._helpers import create_sumo_client_instance


class FieldInfo(BaseModel):
    identifier: str


class AssetInfo(BaseModel):
    """To be implemented"""

    asset_name: str
    fields: List[FieldInfo]


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str


class IterationInfo(BaseModel):
    name: str
    realization_count: int


class SumoExplore:
    def __init__(self, access_token: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)

    async def get_fields(self) -> List[FieldInfo]:
        """Get list of fields"""
        case_collection = CaseCollection(self._sumo_client)
        field_idents = []
        async for case in case_collection:
            case_fields = case.metadata.get("masterdata", {}).get("smda", {}).get("field", [])
            for field in case_fields:
                field_idents.append(field.get("identifier"))

        field_idents = sorted(list(set(field_idents)))
        return [FieldInfo(identifier=field_ident) for field_ident in field_idents]

    async def get_cases(self, field_identifier: str) -> List[CaseInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(field=field_identifier)

        case_info_arr: List[CaseInfo] = []
        async for case in case_collection:
            case_info_arr.append(CaseInfo(uuid=case.uuid, name=case.name, status=case.status, user=case.user))

        # Sort on case name before returning
        case_info_arr.sort(key=lambda case_info: case_info.name)

        return case_info_arr

    async def get_iterations(self, case_uuid: str) -> List[IterationInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(uuid=case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"Sumo case not found {case_uuid=}")

        case: Case = await case_collection.getitem_async(0)
        iter_info_arr: List[IterationInfo] = [
            IterationInfo(name=iteration.get("name"), realization_count=iteration.get("realizations"))
            for iteration in case.iterations
        ]

        # Sort on iteration name before returning
        iter_info_arr.sort(key=lambda iter_info: iter_info.name)

        return iter_info_arr
