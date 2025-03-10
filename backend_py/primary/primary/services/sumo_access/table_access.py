import logging
from typing import List

import pyarrow as pa
from fmu.sumo.explorer.objects import Case


from primary.services.service_exceptions import NoDataError, MultipleDataMatchesError, Service

from ._helpers import create_sumo_case_async
from .generic_types import SumoTableSchema
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class TableAccess:
    """Generic access to Sumo tables"""

    def __init__(self, case: Case, iteration_name: str):
        self._case: Case = case
        self._iteration_name: str = iteration_name

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "TableAccess":
        sumo_client = create_sumo_client(access_token)
        case: Case = await create_sumo_case_async(client=sumo_client, case_uuid=case_uuid, want_keepalive_pit=False)
        return TableAccess(case=case, iteration_name=iteration_name)

    async def get_table_schemas_single_realization_async(self, realization: int = 0) -> List[SumoTableSchema]:
        """Get all table descriptions for a given realization"""

        table_collection = self._case.tables.filter(
            realization=realization,
            iteration=self._iteration_name,
        )

        return [
            SumoTableSchema(
                name=table.name,
                tagname=table.tagname,
                column_names=table.metadata.get("data", {}).get("spec", {}).get("columns", []),
            )
            async for table in table_collection
        ]

    async def get_realization_table_async(
        self,
        table_schema: SumoTableSchema,
        realization: int = 0,
    ) -> pa.Table:
        """Get a pyarrow table for a given realization"""

        table_collection = self._case.tables.filter(
            name=table_schema.name,
            tagname=table_schema.tagname,
            iteration=self._iteration_name,
            realization=realization,
        )
        table_length = await table_collection.length_async()
        if table_length == 0:
            raise NoDataError(f"No table found for {table_schema=}", Service.SUMO)
        if table_length > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for {table_schema=}", Service.SUMO)

        sumo_table = await table_collection.getitem_async(0)
        return await sumo_table.to_arrow_async()

    def realizations_tables_are_equal(self, table_schema: SumoTableSchema) -> bool:
        """Check if a given table has the same data for all realizations"""

        table_collection = self._case.tables.filter(
            tagname=table_schema.tagname,
            iteration=self._iteration_name,
            stage="realization",
        )

        if not table_collection:
            raise NoDataError(f"No table found for vector {table_schema=}", Service.SUMO)

        # How to get the md5 sum? Maybe something like this, but the md5 is not in the metadata....
        md5s = [table.metadata.get("file", {}).get("md5_sum", None) for table in table_collection]
        return all(md5s[0] == md5s[i] for i in range(1, len(md5s)))
