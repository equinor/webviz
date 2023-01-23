from typing import List, Optional

from ._helpers import create_sumo_explorer_instance

from fmu.sumo.explorer import Case, Explorer


class CaseAccess:
    def __init__(self, access_token: str, sumo_case_id: str):
        self._sumo_explorer: Explorer = create_sumo_explorer_instance(access_token)
        self._sumo_case_id = sumo_case_id
        self._sumo_case_obj: Optional[Case] = None

    def is_case_accessible(self) -> bool:
        if self._get_or_create_sumo_case_obj():
            return True

        return False

    def get_iterations(self) -> List[int]:
        sumo_case = self._get_or_create_sumo_case_obj()
        if not sumo_case:
            return []

        return sumo_case.get_iterations()
