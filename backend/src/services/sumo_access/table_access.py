import logging
from typing import List

import pyarrow as pa
from fmu.sumo.explorer.objects import CaseCollection
from sumo.wrapper import SumoClient

from ._helpers import create_sumo_client_instance
from .generic_types import SumoTableSchema

LOGGER = logging.getLogger(__name__)


class TableAccess:
    """Generic access to Sumo tables"""

    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._iteration_name = iteration_name
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)

        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {case_uuid=}")

        self.case = case_collection[0]

    def get_table_schemas_single_realization(self, realization: int = 0) -> List[SumoTableSchema]:
        """Get all table descriptions for a given realization"""

        table_collection = self.case.tables.filter(
            realization=realization,
            iteration=self._iteration_name,
        )

        return [
            SumoTableSchema(
                name=table.name,
                tagname=table.tagname,
                column_names=table.metadata.get("data", {}).get("spec", {}).get("columns", []),
            )
            for table in table_collection
        ]

    def get_realization_table(
        self,
        table_schema: SumoTableSchema,
        realization: int = 0,
    ) -> pa.Table:
        """Get a pyarrow table for a given realization"""

        table_collection = self.case.tables.filter(
            name=table_schema.name,
            tagname=table_schema.tagname,
            iteration=self._iteration_name,
            realization=realization,
        )
        if not table_collection:
            raise ValueError(f"No table found for {table_schema=}")
        if len(table_collection) > 1:
            raise ValueError(f"Multiple tables found for {table_schema=}")

        sumo_table = table_collection[0]
        return sumo_table.arrowtable

    def realizations_tables_are_equal(self, table_schema: SumoTableSchema) -> bool:
        """Check if a given table has the same data for all realizations"""

        table_collection = self.case.tables.filter(
            tagname=table_schema.tagname,
            iteration=self._iteration_name,
            stage="realization",
        )

        if not table_collection:
            raise ValueError(f"No table found for vector {table_schema=}")

        # How to get the md5 sum? Maybe something like this, but the md5 is not in the metadata....
        md5s = [table.metadata.get("file", {}).get("md5_sum", None) for table in table_collection]
        return all(md5s[0] == md5s[i] for i in range(1, len(md5s)))
