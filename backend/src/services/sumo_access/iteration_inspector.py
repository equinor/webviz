from typing import List, Sequence
from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient

from ._helpers import create_sumo_client_instance


class IterationInspector:
    """
    Class for inspecting and retrieving iteration (ensemble) information
    """

    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {case_uuid=}")

        self._case: Case = case_collection[0]
        self._iteration_name: str = iteration_name

    def get_case_name(self) -> str:
        """Get name of case to which this iteration belongs"""
        return self._case.name

    def get_realizations(self) -> Sequence[int]:
        """Get list of realizations for this iteration"""
        realizations = self._case.get_realizations(self._iteration_name)
        return sorted([int(real) for real in realizations])
