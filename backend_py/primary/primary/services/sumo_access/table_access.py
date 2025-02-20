from typing import List

import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient

from primary.services.service_exceptions import (
    Service,
    MultipleDataMatchesError,
    NoDataError,
)

from .generic_types import SumoTableSchema
from ._helpers import create_sumo_client


class TableAccess:
    """Generic access to Sumo tables"""

    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "TableAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_table_schemas_single_realization_async(self, realization: int = 0) -> List[SumoTableSchema]:
        """Get all table descriptions for a given realization"""

        table_context = self._ensemble_context.tables.filter(
            realization=realization,
        )
        return [
            SumoTableSchema(
                name=table.name,
                tagname=table.tagname,
                column_names=table.metadata.get("data", {}).get("spec", {}).get("columns", []),
            )
            async for table in table_context
        ]

    async def get_realization_table_async(
        self,
        table_schema: SumoTableSchema,
        realization: int = 0,
    ) -> pa.Table:
        """Get a pyarrow table for a given realization"""

        table_context = self._ensemble_context.tables.filter(
            realization=realization,
            name=table_schema.name,
            tagname=table_schema.tagname,
        )
        table_count = await table_context.length_async()
        if table_count == 0:
            raise NoDataError(f"No table found for {table_schema=}", Service.SUMO)
        if table_count > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for {table_schema=}", Service.SUMO)

        sumo_table = await table_context.getitem_async(0)
        return await sumo_table.to_arrow_async()
