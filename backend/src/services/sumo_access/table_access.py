import logging
from typing import List

import pyarrow as pa
from fmu.sumo.explorer.objects import CaseCollection
from sumo.wrapper import SumoClient

from src.services.types.generic_types import TableMetaData

from ._helpers import create_sumo_client_instance

LOGGER = logging.getLogger(__name__)


class TableAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name

    def get_realization_tables_metadata(self, realization: int = 0) -> List[TableMetaData]:
        """Get all table descriptions for a given realization"""

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]
        table_collection = case.tables.filter(
            realization=realization,
            iteration=self._iteration_name,
        )

        return [
            TableMetaData(
                name=table.name,
                tagname=table.tagname,
                column_names=table.metadata.get("data", {}).get("spec", {}).get("columns", []),
                file_format=table.format,
            )
            for table in table_collection
        ]

    def get_realization_table(
        self,
        table_metadata: TableMetaData,
        realization: int = 0,
    ) -> pa.Table:
        """Get a pyarrow table for a given realization"""

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]

        table_collection = case.tables.filter(
            name=table_metadata.name,
            tagname=table_metadata.tagname,
            iteration=self._iteration_name,
            realization=realization,
        )
        if len(table_collection) == 0:
            raise ValueError(f"No table found for vector {table_metadata=}")
        if len(table_collection) > 1:
            raise ValueError(f"Multiple tables found for vector {table_metadata=}")

        sumo_table = table_collection[0]
        return sumo_table.arrowtable

    def realizations_tables_are_equal(self, table_metadata) -> bool:
        """Check if all realizations have equal table"""

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]
        table_collection = case.tables.filter(
            tagname=table_metadata.tagname,
            iteration=self._iteration_name,
            stage="realization",
        )

        if len(table_collection) == 0:
            raise ValueError(f"No table found for vector {table_metadata=}")

        # How to get the md5 sum? Maybe something like this, but the md5 is not in the metadata....
        md5s = [table.metadata.get("file", {}).get("md5", None) for table in table_collection]
        return all(md5s[0] == md5s[i] for i in range(1, len(md5s)))
