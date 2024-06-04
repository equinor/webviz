from typing import List
from pydantic import BaseModel

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from ._helpers import create_sumo_client


class FieldInfo(BaseModel):
    identifier: str


class CaseInfo(BaseModel):
    uuid: str
    name: str
    status: str
    user: str


class SumoInspector:
    def __init__(self, access_token: str):
        self._sumo_client: SumoClient = create_sumo_client(access_token)

    async def get_fields_async(self) -> List[FieldInfo]:
        """Get list of fields"""
        case_collection = CaseCollection(self._sumo_client)
        field_idents = await case_collection.fields_async
        field_idents = sorted(list(set(field_idents)))

        return [FieldInfo(identifier=field_ident) for field_ident in field_idents]

    async def get_cases_async(self, field_identifier: str) -> List[CaseInfo]:
        case_collection = CaseCollection(self._sumo_client).filter(field=field_identifier)

        case_info_arr: List[CaseInfo] = []
        async for case in case_collection:
            case_info_arr.append(CaseInfo(uuid=case.uuid, name=case.name, status=case.status, user=case.user))

        # Sort on case name before returning
        case_info_arr.sort(key=lambda case_info: case_info.name)

        return case_info_arr
