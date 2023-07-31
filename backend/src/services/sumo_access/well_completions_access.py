from typing import Optional, Sequence
from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient

from ._helpers import create_sumo_client_instance


class WellCompletionsAccess:
    """
    Class for accessing and retrieving well completions data
    """

    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
        if len(case_collection) > 1:
            raise ValueError(f"Multiple sumo cases found {case_uuid=}")
        if len(case_collection) < 1:
            raise ValueError(f"No sumo cases found {case_uuid=}")

        self._case: Case = case_collection[0]
        self._iteration_name: str = iteration_name
        self._tagname = "wellcompletiondata"  # TODO: Should tagname be hard coded?

    def get_well_completion_data(self, realizations: Optional[Sequence[int]]) -> any:
        """Get well completion data for case and iteration"""

        # TODO: No need for table name?
        # _table_name = "DROGON"

        # With single realization, return the table
        # if realizations is not None and len(realizations) is 1:
        #     well_completion_tables = self._case.tables.filter(
        #         tagname=self._tagname, realization=realizations[0], iteration=self._iteration_name
        #     )

        #     return well_completion_tables[0] if len(well_completion_tables) > 0 else {}

        # With multiple realizations, retrieve each column and concatenate
        well_completion_tables = self._case.tables.filer(
            tagname=self._tagname, aggregation="collection", iteration=self._iteration_name
        )
