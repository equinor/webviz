import logging
from io import BytesIO
from typing import List, Optional, Sequence, Union, Tuple

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import TableCollection, Table
from pydantic import BaseModel

from ..service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
    MultipleDataMatchesError,
)

from ._helpers import SumoEnsemble


# Allowed categories (index column names) for the volumetric tables
ALLOWED_CATEGORY_COLUMN_NAMES = ["ZONE", "REGION", "FACIES", "LICENSE"]

# Allowed result names for the volumetric tables
ALLOWED_RESULT_COLUMN_NAMES = [
    "BULK_OIL",
    "BULK_WATER",
    "BULK_GAS",
    "NET_OIL",
    "NET_WATER",
    "NET_GAS",
    "PORV_OIL",
    "PORV_WATER",
    "PORV_GAS",
    "HCPV_OIL",
    "HCPV_GAS",
    "STOIIP_OIL",
    "GIIP_GAS",
    "ASSOCIATEDGAS_OIL",
    "ASSOCIATEDOIL_GAS",
]

# Columns to ignore in the volumetric tables
IGNORED_COLUMN_NAMES = [
    "REAL",
    "BULK_TOTAL",
    "NET_TOTAL",
    "PORV_TOTAL",
    "HCPV_TOTAL",
    "STOIIP_TOTAL",
    "GIIP_TOTAL",
    "ASSOCIATEDGAS_TOTAL",
    "ASSOCIATEDOIL_TOTAL",
]


class InplaceVolumetricsCategoryValues(BaseModel):
    """Unique values for an category (index column) in a volumetric table
    All values should ideally be strings, but it is commmon to see integers, especially for REGION"""

    category_name: str
    unique_values: List[Union[str, int]]


class InplaceVolumetricsTableDefinition(BaseModel):
    """Definition of a volumetric table"""

    name: str
    categories: List[InplaceVolumetricsCategoryValues]
    result_names: List[str]


class InplaceVolumetricData(BaseModel):
    vol_table_name: str
    categories: Optional[List[InplaceVolumetricsCategoryValues]] = None
    result_name: str
    result_per_realization: List[Tuple[int, float]]


LOGGER = logging.getLogger(__name__)


class InplaceVolumetricsAccess(SumoEnsemble):
    async def get_inplace_volumetrics_table_definitions_async(self) -> List[InplaceVolumetricsTableDefinition]:
        """Retrieve the table definitions for the volumetric tables"""
        vol_table_collections: TableCollection = self._case.tables.filter(
            aggregation="collection", tagname=["vol", "volumes"], iteration=self._iteration_name
        )
        vol_table_names = await vol_table_collections.names_async
        if len(vol_table_names) == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}",
                Service.SUMO,
            )

        table_definitions = []

        # Need to iterate through each table to get colum names and unique index values
        for vol_table_name in vol_table_names:
            vol_table_as_collection: TableCollection = self._case.tables.filter(
                aggregation="collection",
                name=vol_table_name,
                tagname=["vol", "volumes"],
                iteration=self._iteration_name,
            )
            vol_table_name_as_arr = await vol_table_as_collection.names_async
            if len(vol_table_name_as_arr) > 1:
                raise MultipleDataMatchesError(
                    f"Multiple inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={vol_table_name}",
                    Service.SUMO,
                )
            vol_table_column_names = await vol_table_as_collection.columns_async

            invalid_column_names = []
            for col in vol_table_column_names:
                if col in IGNORED_COLUMN_NAMES:
                    continue
                if col not in ALLOWED_CATEGORY_COLUMN_NAMES + ALLOWED_RESULT_COLUMN_NAMES:
                    invalid_column_names.append(col)
            if invalid_column_names:
                LOGGER.warning(
                    f"Invalid column names found in the volumetric table case={self._case_uuid}, iteration={self._iteration_name}, {invalid_column_names}"
                )
                # raise InvalidDataError(
                #     f"Invalid column names found in the volumetric table case={self._case_uuid}, iteration={self._iteration_name}, {invalid_column_names}",
                #     Service.SUMO,
                # )
            category_names = [col for col in vol_table_column_names if col in ALLOWED_CATEGORY_COLUMN_NAMES]

            if len(category_names) == 0:
                raise InvalidDataError(
                    f"No index columns found in the volumetric table {self._case_uuid}, {vol_table_name}",
                    Service.SUMO,
                )

            result_column_names = [col for col in vol_table_column_names if col in ALLOWED_RESULT_COLUMN_NAMES]
            if len(result_column_names) == 0:
                raise InvalidDataError(
                    f"No result columns found in the volumetric table {self._case_uuid}, {vol_table_name}",
                    Service.SUMO,
                )

            categories = []

            # Need to download the table to get the unique index values
            # Picking a random result column to get the table
            sumo_table_obj = await self._get_sumo_table_async(vol_table_name, result_column_names[0])
            arrow_table = await _fetch_arrow_table_async(sumo_table_obj)
            for index_column_name in category_names:
                unique_values = arrow_table[index_column_name].unique()
                categories.append(
                    InplaceVolumetricsCategoryValues(
                        category_name=index_column_name, unique_values=unique_values.to_pylist()
                    )
                )
            table_definitions.append(
                InplaceVolumetricsTableDefinition(
                    name=vol_table_name,
                    categories=categories,
                    result_names=result_column_names,
                )
            )
        return table_definitions

    async def get_volumetric_data_async(
        self,
        table_name: str,
        result_name: str,
        categories: List[InplaceVolumetricsCategoryValues],
        realizations: Sequence[int],
    ) -> InplaceVolumetricData:
        """Retrieve the volumetric data for a single result (e.g. STOIIP_OIL), optionally filtered by realizations and category values."""
        if result_name not in ALLOWED_RESULT_COLUMN_NAMES:
            raise InvalidDataError(
                f"Invalid result name {result_name} for the volumetric table {self._case_uuid}, {table_name}",
                Service.SUMO,
            )
        sumo_table_obj = await self._get_sumo_table_async(table_name, result_name)
        arrow_table = await _fetch_arrow_table_async(sumo_table_obj)

        if realizations is not None:
            arrow_table = _filter_arrow_table(arrow_table, "REAL", realizations)

        if categories is not None:
            for category in categories:
                if category.category_name not in ALLOWED_CATEGORY_COLUMN_NAMES:
                    raise InvalidDataError(
                        f"Invalid category name {category.category_name} for the volumetric table {self._case_uuid}, {table_name}",
                        Service.SUMO,
                    )
                arrow_table = _filter_arrow_table(arrow_table, category.category_name, category.unique_values)

        summed_on_real_table = arrow_table.group_by("REAL").aggregate([(result_name, "sum")]).sort_by("REAL")

        return InplaceVolumetricData(
            vol_table_name=table_name,
            result_name=result_name,
            result_per_realization=zip(
                summed_on_real_table["REAL"].to_pylist(), summed_on_real_table[f"{result_name}_sum"].to_pylist()
            ),
            categories=categories,
        )

    async def _get_sumo_table_async(self, table_name: str, result_name: Optional[str] = None) -> Table:
        """Get a sumo table object. Expecting only one table to be found.
        A result_name(column) is optional. If provided, the table will be filtered based on the result_name.
        If not provided apparently a table with a random (first found?) column will be returned"""

        vol_table_as_collection: TableCollection = self._case.tables.filter(
            aggregation="collection",
            name=table_name,
            tagname=["vol", "volumes"],
            iteration=self._iteration_name,
            column=result_name,
        )
        vol_table_name_as_arr = await vol_table_as_collection.names_async
        if len(vol_table_name_as_arr) == 0:
            raise NoDataError(
                f"No inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name},, table_name={vol_table_name_as_arr}",
                Service.SUMO,
            )
        if len(vol_table_name_as_arr) > 1:
            raise MultipleDataMatchesError(
                f"Multiple inplace volumetrics tables found in case={self._case_uuid}, iteration={self._iteration_name}, table_name={vol_table_name_as_arr}",
                Service.SUMO,
            )
        sumo_table_obj = await vol_table_as_collection.getitem_async(0)
        return sumo_table_obj


async def _fetch_arrow_table_async(sumo_table_obj: Table) -> pa.Table:
    """Fetch arrow table from sumo blob store."""
    byte_stream: BytesIO = await sumo_table_obj.blob_async
    arrow_table: pa.Table = pq.read_table(byte_stream)
    return arrow_table


def _filter_arrow_table(arrow_table: pa.Table, column_name: str, column_values: List[Union[str, float]]) -> pa.Table:
    """Filter arrow table based on column values."""
    mask = pc.is_in(arrow_table[column_name], value_set=pa.array(column_values))
    arrow_table = arrow_table.filter(mask)
    return arrow_table