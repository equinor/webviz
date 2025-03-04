from typing import List, Optional

import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_pkg.core_utils.perf_timer import PerfTimer
from primary.services.service_exceptions import InvalidDataError, NoDataError, Service
from ._loaders import load_aggregated_arrow_table_multiple_columns_from_sumo, load_single_realization_arrow_table
from ._arrow_table_loader import ArrowTableLoader


from .sumo_client_factory import create_sumo_client

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_IDENTIFIER_COLUMN_VALUES = ["Totals"]

# Allowed raw volumetric columns - from FMU Standard:
# Ref: https://github.com/equinor/fmu-dataio/blob/66e9683de5943d1b982c14ac926cf13007fc2bad/src/fmu/dataio/export/rms/volumetrics.py#L25-L47
ALLOWED_RAW_VOLUMETRIC_COLUMNS = [
    "REAL",
    "ZONE",
    "REGION",
    "LICENSE",
    "FACIES",
    "BULK_OIL",
    "NET_OIL",
    "PORV_OIL",
    "HCPV_OIL",
    "STOIIP_OIL",
    "ASSOCIATEDGAS_OIL",
    "BULK_GAS",
    "NET_GAS",
    "PORV_GAS",
    "HCPV_GAS",
    "GIIP_GAS",
    "ASSOCIATEDOIL_GAS",
    "BULK_TOTAL",
    "NET_TOTAL",
    "PORV_TOTAL",
]

POSSIBLE_IDENTIFIER_COLUMNS = ["ZONE", "REGION", "FACIES", "LICENSE"]


class InplaceVolumetricsAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "InplaceVolumetricsAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    @staticmethod
    def get_possible_identifier_columns() -> List[str]:
        return POSSIBLE_IDENTIFIER_COLUMNS

    @staticmethod
    def get_possible_selector_columns() -> List[str]:
        """
        The identifier columns and REAL column represent the selector columns of the volumetric table.
        """
        return InplaceVolumetricsAccess.get_possible_identifier_columns() + ["REAL"]

    async def get_inplace_volumetrics_table_names_async(self) -> List[str]:

        table_context = self._ensemble_context.tables.filter(content="volumes")
        table_names = await table_context.names_async
        return table_names

    async def get_inplace_volumetrics_aggregated_table_async(
        self, table_name: str, column_names: Optional[set[str]] = None
    ) -> pa.Table:
        """
        Get inplace volumetrics data for list of columns for given case and iteration as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the requested column names.
        """

        table_context = self._ensemble_context.tables.filter(
            name=table_name,
            content="volumes",
            column=column_names if column_names is None else list(column_names),
        )

        available_column_names = await table_context.columns_async
        available_response_names = [
            col for col in available_column_names if col not in self.get_possible_selector_columns()
        ]
        if column_names is not None and not column_names.issubset(set(available_response_names)):
            raise InvalidDataError(
                f"Missing requested columns: {column_names}, in the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        requested_columns = available_response_names if column_names is None else list(column_names)

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_content_type("volumes")
        table_loader.require_table_name(table_name)
        pa_table: pa.Table = await table_loader.get_aggregated_multiple_columns_async(requested_columns)

        return pa_table

    async def get_inplace_volumetrics_columns_async(self, table_name: str) -> dict[str, List[str]]:
        """
        Get inplace volumetrics data for list of columns for given case and iteration as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the requested column names.
        """

        realizations = await self._ensemble_context._get_field_values_async("fmu.realization.id")
        if len(realizations) == 0:
            raise InvalidDataError(
                f"No realizations found in the ensemble {self._case_uuid}, {self._iteration_name}",
                Service.SUMO,
            )
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_content_type("volumes")
        table_loader.require_table_name(table_name)

        pa_table: pa.Table = await table_loader.get_single_realization_async(realizations[0])

        column_names = pa_table.column_names
        column_names_and_values = {}
        for col in column_names:
            column_names_and_values[col] = pa_table[col].unique().to_pylist()
        return column_names_and_values
