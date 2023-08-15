from typing import Sequence
from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient

from ._helpers import create_sumo_client_instance


class IterationInspector:
    """
    Class for inspecting and retrieving iteration (ensemble) information
    """

    def __init__(self, sumo_case: Case, iteration_name: str):
        self._case: Case = sumo_case
        self._iteration_name: str = iteration_name

    @staticmethod
    def from_case_uuid(access_token: str, case_uuid: str, iteration_name: str) -> "IterationInspector":
        """Create inspector instance from case UUID"""
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {case_uuid=}")

        my_sumo_case: Case = case_collection[0]
        return IterationInspector(sumo_case=my_sumo_case, iteration_name=iteration_name)

    @staticmethod
    def from_sumo_case(sumo_case: Case, iteration_name: str) -> "IterationInspector":
        """Create inspector instance from an already discovered Sumo Case object"""
        return IterationInspector(sumo_case=sumo_case, iteration_name=iteration_name)

    def get_realizations(self) -> Sequence[int]:
        """Get list of realizations for this iteration"""
        realizations = self._case.get_realizations(self._iteration_name)
        return sorted([int(real) for real in realizations])
