from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

from fmu.sumo.explorer import Explorer

from ._helpers import create_sumo_explorer_instance


@dataclass(frozen=True)
class CaseInfo:
    sumo_case_id: str
    name: str
    status: str
    timestamp: str
    description: str


class Discovery:
    def __init__(self, access_token: str):
        self._sumo_explorer: Explorer = create_sumo_explorer_instance(access_token)

    def get_cases(self, field_identifier: str, status: Optional[str]) -> List[CaseInfo]:

        status_list = [status] if status else None
        sumo_cases = self._sumo_explorer.get_cases(fields=[field_identifier], status=status_list)

        case_info_arr: List[CaseInfo] = []
        for sumo_case in sumo_cases:
            # pprint.pprint(sumo_case.meta_data)

            # Todo
            # What is the correct way of determining datetime here??
            timestamp_str = ""
            tracklog = sumo_case.meta_data["_source"].get("tracklog")
            if tracklog and len(tracklog) > 0:
                timestamp_str = tracklog[-1].get("datetime")

            description_list = sumo_case.meta_data["_source"]["fmu"]["case"].get("description", [])
            description_str = description_list[0] if len(description_list) > 0 else ""

            case_info = CaseInfo(
                sumo_case_id=sumo_case.sumo_id,
                name=sumo_case.case_name,
                status=sumo_case.status,
                timestamp=timestamp_str,
                description=description_str,
            )

            case_info_arr.append(case_info)

        return case_info_arr

    def get_case_ids_with_smry_data(self, field_identifier: str):
        hits = self._sumo_explorer._sumo.get(
            "/search",
            query=f"class:table AND \
                    masterdata.smda.field.identifier:{field_identifier} AND \
                    data.name:summary AND \
                    fmu.realization.id:0 AND \
                    fmu.iteration.id:0",
            select="_sumo.parent_object",
        )["hits"]["hits"]
        if not hits:
            return []
        return [hit["_source"]["_sumo"]["parent_object"] for hit in hits]
