import logging
from typing import List

from fmu.sumo.explorer.explorer import CaseCollection, SumoClient

from .queries.case import get_stratigraphic_column, get_field_identifiers
from ._helpers import create_sumo_client_instance


LOGGER = logging.getLogger(__name__)


class CaseAccess:
    def __init__(self, access_token: str, case_uuid: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self.case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(self.case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

    def get_stratigraphic_column(self) -> str:
        """Retrieve the stratigraphic column for a case"""

        strat_column = get_stratigraphic_column(self._sumo_client, self._case_uuid)
        return strat_column

    def get_field_identifiers(self) -> List[str]:
        """Retrieve the field identifiers for a case"""

        field_identifiers = get_field_identifiers(self._sumo_client, self._case_uuid)
        return field_identifiers
