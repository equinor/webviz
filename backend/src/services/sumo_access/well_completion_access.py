from typing import Optional

import pandas as pd

from fmu.sumo.explorer.explorer import CaseCollection, Case, SumoClient
from ._helpers import create_sumo_client_instance


class WellCompletionAccess:
    """
    Class for accessing and retrieving well completion data
    """

    def __init__(self, access_token: str, case_uuid: str, iteration_name: str) -> None:
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
        if len(case_collection) > 1:
            raise ValueError(f"Multiple sumo cases found {case_uuid=}")
        if len(case_collection) < 1:
            raise ValueError(f"No sumo cases found {case_uuid=}")

        self._case: Case = case_collection[0]
        self._iteration_name = iteration_name
        self._tagname = str("wellcompletiondata")  # Should tagname be hard coded?

    def get_well_completion_data(self, realization: Optional[int]) -> pd.DataFrame:
        """Get well completion data for case and iteration"""

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
        # Expect one table with aggregated OP/SH and one with aggregate KH data
        well_completion_tables = self._case.tables.filter(
            tagname=self._tagname, aggregation="collection", iteration=self._iteration_name
        )

        # Improve code (iterate over tables and concatenate) - concat gives issue? See jupyter-notebook
        if len(well_completion_tables) < 2:
            return {}

        first_df = well_completion_tables[0].to_pandas
        second_df = well_completion_tables[1].to_pandas

        expected_columns = set(["WELL", "DATE", "ZONE", "REAL"])
        if not set(first_df.columns).issuperset(expected_columns) or not set(second_df.columns).issuperset(
            expected_columns
        ):
            raise ValueError(
                f"Expected df columns to be superset of columns: {expected_columns} - got: {first_df.columns} and {second_df.columns}"
            )

        if "OP/SH" in first_df.columns and "KH" in second_df.columns:
            first_df["KH"] = second_df["KH"]
            return first_df

        if "OP/SH" in second_df.columns and "KH" in first_df.columns:
            second_df["KH"] = first_df["KH"]
            return second_df

        raise ValueError('Expected columns "OP/SH" and "KH" not found in tables')
