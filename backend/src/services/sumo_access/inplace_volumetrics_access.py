import logging
from enum import Enum
from io import BytesIO
from typing import List, Optional, Sequence, Union
import time

from concurrent.futures import ThreadPoolExecutor
import pandas as pd

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import TableCollection, Case
from pydantic import ConfigDict, BaseModel

from ._helpers import SumoEnsemble
from .generic_types import EnsembleScalarResponse

from ..utils.perf_timer import PerfTimer

# from fmu.sumo.explorer.objects.table import AggregatedTable


LOGGER = logging.getLogger(__name__)


class PossibleInplaceVolumetricsCategoricalColumnNames(str, Enum):
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"

    @classmethod
    def has_value(cls, value: str) -> bool:
        return value in cls._value2member_map_


class PossibleInplaceVolumetricsNumericalColumnNames(str, Enum):
    BULK_OIL = "BULK_OIL"
    BULK_WATER = "BULK_WATER"
    BULK_GAS = "BULK_GAS"
    NET_OIL = "NET_OIL"
    NET_WATER = "NET_WATER"
    NET_GAS = "NET_GAS"
    PORV_OIL = "PORV_OIL"
    PORV_WATER = "PORV_WATER"
    PORV_GAS = "PORV_GAS"
    HCPV_OIL = "HCPV_OIL"
    HCPV_GAS = "HCPV_GAS"
    STOIIP_OIL = "STOIIP_OIL"
    GIIP_GAS = "GIIP_GAS"
    ASSOCIATEDGAS_OIL = "ASSOCIATEDGAS_OIL"
    ASSOCIATEDOIL_GAS = "ASSOCIATEDOIL_GAS"

    @classmethod
    def has_value(cls, value: str) -> bool:
        return value in cls._value2member_map_


class InplaceVolumetricsCategoricalMetaData(BaseModel):
    name: str
    unique_values: List[Union[str, int, float]]
    model_config = ConfigDict(from_attributes=True)  # Might be removed


class InplaceVolumetricsTableMetaData(BaseModel):
    name: str
    categorical_column_metadata: List[InplaceVolumetricsCategoricalMetaData]
    numerical_column_names: List[str]
    model_config = ConfigDict(from_attributes=True)  # Might be removed


class InplaceVolumetricsAccess(SumoEnsemble):
    async def get_table_names_and_metadata(
        self,
    ) -> List[InplaceVolumetricsTableMetaData]:
        """Retrieve the available volumetric tables names and corresponding metadata for the case"""
        timer = PerfTimer()
        vol_table_collections: TableCollection = self._case.tables.filter(
            aggregation="collection", tagname="vol", iteration=self._iteration_name
        )
        vol_tables_metadata = []
        vol_table_names = await vol_table_collections.names_async
        for vol_table_name in vol_table_names:
            vol_table_collection: TableCollection = self._case.tables.filter(
                aggregation="collection",
                name=vol_table_name,
                tagname="vol",
                iteration=self._iteration_name,
            )
            vol_table_column_names = await vol_table_collection.columns_async
            numerical_column_names = [
                col for col in vol_table_column_names if PossibleInplaceVolumetricsNumericalColumnNames.has_value(col)
            ]
            first_numerical_column_table = await _load_arrow_table_from_sumo(
                self._case,
                self._iteration_name,
                vol_table_name,
                numerical_column_names[0],
            )
            categorical_column_metadata = [
                InplaceVolumetricsCategoricalMetaData(
                    name=col,
                    unique_values=pc.unique(first_numerical_column_table[col]).to_pylist(),
                )
                for col in vol_table_column_names
                if PossibleInplaceVolumetricsCategoricalColumnNames.has_value(col)
            ]
            vol_table_metadata = InplaceVolumetricsTableMetaData(
                name=vol_table_name,
                categorical_column_metadata=categorical_column_metadata,
                numerical_column_names=numerical_column_names,
            )

            vol_tables_metadata.append(vol_table_metadata)
        LOGGER.debug(f"Got volumetric table names and metadata Sumo in: {timer.elapsed_ms()}ms")
        return vol_tables_metadata

    async def get_response(
        self,
        table_name: str,
        column_name: str,
        categorical_filters: Optional[List[InplaceVolumetricsCategoricalMetaData]] = None,
        realizations: Optional[Sequence[int]] = None,
    ) -> EnsembleScalarResponse:
        """Retrieve the volumetric response for the given table name and column name"""
        table = await _load_arrow_table_from_sumo(self._case, self._iteration_name, table_name, column_name)
        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)
        if categorical_filters is not None:
            for category in categorical_filters:
                mask = pc.is_in(table[category.name], value_set=pa.array(category.unique_values))
                table = table.filter(mask)

        summed_on_real_table = table.group_by("REAL").aggregate([(column_name, "sum")]).sort_by("REAL")

        return EnsembleScalarResponse(
            realizations=summed_on_real_table["REAL"].to_pylist(),
            values=summed_on_real_table[f"{column_name}_sum"].to_pylist(),
        )


async def _load_arrow_table_from_sumo(
    case: Case, iteration_name: str, table_name: str, column_name: str
) -> pa.Table:
    timer = PerfTimer()
    vol_table_collection: TableCollection = case.tables.filter(
        aggregation="collection",
        name=table_name,
        tagname="vol",
        iteration=iteration_name,
        column=column_name,
    )
    if await vol_table_collection.length_async() == 0:
        raise ValueError(f"No volumetric tables found for {case.uuid}, {table_name}, {column_name}")
    if await vol_table_collection.length_async() > 1:
        raise ValueError(f"Multiple volumetric tables found for {case.uuid}, {table_name}, {column_name}")

    vol_table = await vol_table_collection.getitem_async(0)
    byte_stream: BytesIO = await vol_table.blob_async
    table: pa.Table = pq.read_table(byte_stream)
    LOGGER.debug(f"Loaded volumetric table {table_name} from Sumo in: {timer.elapsed_ms()}ms")
    return table
