import logging
from typing import List

from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient

from .queries.case import get_stratigraphic_column_identifier, get_field_identifiers
from ._helpers import create_sumo_client_instance
from .iteration_inspector import IterationInspector

LOGGER = logging.getLogger(__name__)


class CaseInspector:
    def __init__(self, access_token: str, case_uuid: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        self._case: Case = case_collection[0]

    def get_case_name(self) -> str:
        """Get name of the case"""
        return self._case.name

    def get_stratigraphic_column_identifier(self) -> str:
        """Retrieve the stratigraphic column identifier for a case"""

        stratigraphic_column_identifier = get_stratigraphic_column_identifier(self._sumo_client, self._case_uuid)
        return stratigraphic_column_identifier

    def get_field_identifiers(self) -> List[str]:
        """Retrieve the field identifiers for a case"""

        field_identifiers = get_field_identifiers(self._sumo_client, self._case_uuid)
        return field_identifiers

    def create_iteration_inspector(self, iteration_name: str) -> IterationInspector:
        return IterationInspector.from_sumo_case(self._case, iteration_name)
