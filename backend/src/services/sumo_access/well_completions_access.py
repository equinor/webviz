from typing import Optional

import pandas as pd

from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient
from fmu.sumo.explorer.objects.table_collection import TableCollection
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

    def get_well_completion_data(self, realization: Optional[int]) -> pd.DataFrame:
        """Get well completion data for case and iteration"""

        well_completion_tables: "TableCollection" = None

        # With single realization, return the table including additional column REAL
        if realization is not None:
            well_completion_tables = self._case.tables.filter(
                tagname=self._tagname, realization=realization, iteration=self._iteration_name
            )
            well_completion_df = well_completion_tables[0].to_pandas if len(well_completion_tables) > 0 else None
            if well_completion_df is None:
                return {}

            well_completion_df["REAL"] = realization
            return well_completion_df

        # With multiple realizations, retrieve each column and concatenate
        well_completion_tables = self._case.tables.filter(
            tagname=self._tagname, aggregation="collection", iteration=self._iteration_name
        )

        # TODO: Improve code (iterate over tables and concatenate) - concat gives issue? See jupyter-notebook
        if len(well_completion_tables) < 2:
            return {}

        well_completion_df = well_completion_tables[0].to_pandas
        kh_df = well_completion_tables[1].to_pandas
        well_completion_df["KH"] = kh_df["KH"]

        return well_completion_df
