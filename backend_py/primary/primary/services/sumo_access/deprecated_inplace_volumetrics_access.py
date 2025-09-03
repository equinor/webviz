import logging
from typing import List, Optional

import pyarrow as pa
import pyarrow.compute as pc
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import InvalidDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)

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


def _tmp_remove_license_column_if_all_values_are_total(pa_table: pa.Table) -> pa.Table:
    """
    Remove the LICENSE column if values in all rows are "Totals"
    This is a temporary fix. ISSUE: #969
    """
    if "LICENSE" in pa_table.column_names:
        license_col = pa_table.column("LICENSE")
        is_total_array = pc.equal(license_col, "Totals")
        all_totals = pc.all(is_total_array).as_py()
        if all_totals:
            pa_table = pa_table.drop("LICENSE")
            LOGGER.debug("Removed LICENSE column from volumetric table as all values were 'Totals'")
    return pa_table


# pylint: disable=invalid-name
class DEPRECATED_InplaceVolumetricsAccess:
    """
    This class is deprecated and will be removed in the future.
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(
        cls, access_token: str, case_uuid: str, ensemble_name: str
    ) -> "DEPRECATED_InplaceVolumetricsAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    @staticmethod
    def get_possible_identifier_columns() -> List[str]:
        return POSSIBLE_IDENTIFIER_COLUMNS

    @staticmethod
    def get_possible_selector_columns() -> List[str]:
        """
        The identifier columns and REAL column represent the selector columns of the volumetric table.
        """
        return DEPRECATED_InplaceVolumetricsAccess.get_possible_identifier_columns() + ["REAL"]

    async def get_inplace_volumetrics_table_names_async(self) -> List[str]:

        table_context = self._ensemble_context.tables.filter(content="volumes")
        table_names = await table_context.names_async
        return table_names

    async def get_inplace_volumetrics_aggregated_table_async(
        self, table_name: str, volumetric_columns: Optional[set[str]] = None
    ) -> pa.Table:
        """
        Get inplace volumes table data for list of volumetric columns for given case and ensemble as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, LICENSE, REAL and the requested volumetric column names.
        """

        perf_metrics = PerfMetrics()

        table_context = self._ensemble_context.tables.filter(
            name=table_name,
            content="volumes",
            column=volumetric_columns if volumetric_columns is None else list(volumetric_columns),
        )

        perf_metrics.reset_lap_timer()
        available_column_names = await table_context.columns_async
        perf_metrics.record_lap("get-column-names")

        available_response_names = [
            col for col in available_column_names if col not in self.get_possible_selector_columns()
        ]
        if volumetric_columns is not None and not volumetric_columns.issubset(set(available_response_names)):
            raise InvalidDataError(
                f"Missing requested columns: {volumetric_columns}, in the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        requested_columns = available_response_names if volumetric_columns is None else list(volumetric_columns)

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_content_type("volumes")
        table_loader.require_table_name(table_name)
        pa_table = await table_loader.get_aggregated_multiple_columns_async(requested_columns)
        perf_metrics.record_lap("load-table")

        pa_table = _tmp_remove_license_column_if_all_values_are_total(pa_table)

        LOGGER.debug(
            f"get_inplace_volumetrics_aggregated_table_async took: {perf_metrics.to_string()}, {table_name=}, {volumetric_columns=}"
        )

        return pa_table

    async def get_inplace_volumetrics_columns_async(self, table_name: str) -> dict[str, List[str]]:
        """
        Get inplace volumetrics data for list of columns for given case and ensemble as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the requested column names.
        """

        realizations = await self._ensemble_context.realizationids_async
        if len(realizations) == 0:
            raise InvalidDataError(
                f"No realizations found in the ensemble {self._case_uuid}, {self._ensemble_name}",
                Service.SUMO,
            )
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._ensemble_name)
        table_loader.require_content_type("volumes")
        table_loader.require_table_name(table_name)

        pa_table = await table_loader.get_single_realization_async(realizations[0])

        pa_table = _tmp_remove_license_column_if_all_values_are_total(pa_table)

        column_names = pa_table.column_names
        column_names_and_values = {}
        for col in column_names:
            column_names_and_values[col] = pa_table[col].unique().to_pylist()
        return column_names_and_values
