from typing import List
import logging

import asyncio
from pydantic import BaseModel

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


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
        timer = PerfMetrics()
        search_context = SearchContext(self._sumo_client)
        field_names = await search_context.fieldidentifiers_async
        timer.record_lap("get_fields")
        field_idents = sorted(list(set(field_names)))
        LOGGER.debug(timer.to_string())
        return [FieldInfo(identifier=field_ident) for field_ident in field_idents]

    async def _get_case_info_async(self, search_context: SearchContext, case_uuid: str) -> CaseInfo:

        case = await search_context.get_case_by_uuid_async(case_uuid)
        print(await case.timestamps_async)
        return CaseInfo(uuid=case.uuid, name=case.name, status=case.status, user=case.user)

    async def get_cases_async(self, field_identifier: str) -> List[CaseInfo]:
        """Get list of cases for specified field"""
        timer = PerfMetrics()
        search_context = SearchContext(self._sumo_client)
        field_context = search_context.filter(field=field_identifier, cls="case")
        cases = await field_context.cases_async
        case_uuids = cases.uuids
        timer.record_lap("get case uuids")

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(self._get_case_info_async(search_context, case_uuid)) for case_uuid in case_uuids]

        case_info_arr = [task.result() for task in tasks]

        timer.record_lap("get_cases_for_field")
        case_info_arr = sorted(case_info_arr, key=lambda case_info: case_info.name)
        LOGGER.debug(timer.to_string())
        return case_info_arr
