import logging
from typing import Any, Optional

import pyarrow as pa
from fmu.dataio._models.fmu_results.enums import StandardResultName
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary.services.service_exceptions import InvalidDataError, Service

from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client

from .inplace_volumes_table_types import InplaceVolumes, VolumeColumnsAndIndexUniqueValues


LOGGER = logging.getLogger(__name__)

# Index column values to ignore, i.e. remove from the inplace volume tables
IGNORED_INDEX_COLUMN_VALUES = ["Totals", None]


class InplaceVolumesTableAccess:
    """
    Class for accessing and retrieving inplace volumes table data from Sumo.
    """

    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "InplaceVolumesTableAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    @staticmethod
    def get_index_column_names() -> list[str]:
        """
        The index columns of the volumes table.
        """
        return InplaceVolumes.index_columns()

    @staticmethod
    def get_index_columns() -> list[InplaceVolumes.TableIndexColumns]:
        return list(InplaceVolumes.TableIndexColumns)

    @staticmethod
    def get_required_index_column_names() -> list[str]:
        """
        The required index columns of the volumes table.
        These are the columns that must be present in the table to be valid.
        """
        return InplaceVolumes.required_index_columns()

    @staticmethod
    def get_selector_column_names() -> list[str]:
        """
        The identifier columns and REAL column represent the selector columns of the volumes table.
        """
        return InplaceVolumesTableAccess.get_index_column_names() + ["REAL"]

    async def get_inplace_volumes_table_names_async(self) -> list[str]:
        table_context = self._ensemble_context.tables.filter(standard_result=StandardResultName.inplace_volumes)
        table_names = await table_context.names_async
        return table_names

    async def get_inplace_volumes_aggregated_table_async(
        self, table_name: str, volume_columns: Optional[set[str]] = None
    ) -> pa.Table:
        """
        Get inplace volumes table data for list of columns for given case and iteration as a pyarrow table.

        The volumes are fetched from collection in Sumo and put together in a single table, i.e. a column per response.

        Returns:
        pa.Table with columns: ZONE, REGION, FACIES, REAL, and the requested volume columns.
        """

        perf_metrics = PerfMetrics()

        table_context = self._ensemble_context.tables.filter(
            name=table_name,
            standard_result=StandardResultName.inplace_volumes,
            column=volume_columns if volume_columns is None else list(volume_columns),
        )

        perf_metrics.reset_lap_timer()
        available_column_names = await table_context.columns_async
        perf_metrics.record_lap("get-column-names")

        available_response_names = [
            col for col in available_column_names if col not in self.get_selector_column_names()
        ]
        if volume_columns is not None and not volume_columns.issubset(set(available_response_names)):
            raise InvalidDataError(
                f"Missing requested columns: {volume_columns}, in the inplace volumes table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )

        requested_columns = available_response_names if volume_columns is None else list(volume_columns)

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_standard_result(StandardResultName.inplace_volumes)
        table_loader.require_table_name(table_name)
        pa_table = await table_loader.get_aggregated_multiple_columns_async(requested_columns)
        perf_metrics.record_lap("load-table")

        LOGGER.debug(
            f"get_inplace_volumes_aggregated_table_async took: {perf_metrics.to_string()}, {table_name=}, {volume_columns=}"
        )

        return pa_table

    async def get_column_unique_values_dict_async(self, table_name: str) -> dict[str, list[Any]]:
        """
        Get dictionary of column names and unique values for the inplace volumes table.

        Note: Using first realization found in the ensemble to get the column names and unique values.

        Returns:
        Dictionary with column names as key and array of unique column values as value.
        """

        realizations = await self._ensemble_context.realizationids_async
        if len(realizations) == 0:
            raise InvalidDataError(
                f"No realizations found in the ensemble {self._case_uuid}, {self._iteration_name}",
                Service.SUMO,
            )
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_standard_result(StandardResultName.inplace_volumes)
        table_loader.require_table_name(table_name)

        pa_table = await table_loader.get_single_realization_async(realizations[0])

        column_names = pa_table.column_names
        column_names_and_values = {}
        for col in column_names:
            unique_values: list = pa_table[col].unique().to_pylist()
            valid_unique_values = [val for val in unique_values if val not in IGNORED_INDEX_COLUMN_VALUES]
            column_names_and_values[col] = valid_unique_values

        return column_names_and_values

    async def get_volume_columns_and_index_unique_values_async(
        self, table_name: str
    ) -> VolumeColumnsAndIndexUniqueValues:
        """
        Get object with list of inplace volume columns and dictionary of index columns with their unique column values for the inplace volumes table.
        """
        realizations = await self._ensemble_context.realizationids_async
        if len(realizations) == 0:
            raise InvalidDataError(
                f"No realizations found in the ensemble {self._case_uuid}, {self._iteration_name}",
                Service.SUMO,
            )
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_standard_result(StandardResultName.inplace_volumes)
        table_loader.require_table_name(table_name)

        pa_table = await table_loader.get_single_realization_async(realizations[0])
        column_names = pa_table.column_names

        index_columns = [col for col in InplaceVolumesTableAccess.get_index_column_names() if col in column_names]
        volumetric_columns = [col for col in column_names if col not in index_columns]

        index_column_unique_values_map = {}
        for col in index_columns:
            unique_values: list = pa_table[col].unique().to_pylist()
            valid_unique_values = [val for val in unique_values if val not in IGNORED_INDEX_COLUMN_VALUES]
            index_column_unique_values_map[col] = valid_unique_values

        return VolumeColumnsAndIndexUniqueValues(
            volume_columns=volumetric_columns, index_unique_values_map=index_column_unique_values_map
        )
