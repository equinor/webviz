import logging
from enum import Enum
from io import BytesIO
from typing import List, Optional, Sequence, Union

from concurrent.futures import ThreadPoolExecutor
import pandas as pd

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import TableCollection
from pydantic import ConfigDict, BaseModel

from ._helpers import SumoEnsemble
from .generic_types import EnsembleScalarResponse

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
    model_config = ConfigDict(from_attributes=True)


class InplaceVolumetricsTableMetaData(BaseModel):
    name: str
    categorical_column_metadata: List[InplaceVolumetricsCategoricalMetaData]
    numerical_column_names: List[str]
    model_config = ConfigDict(from_attributes=True)


class InplaceVolumetricsAccess(SumoEnsemble):
    async def get_table_names_and_metadata(self) -> List[InplaceVolumetricsTableMetaData]:
        """Retrieve the available volumetric tables names and corresponding metadata for the case"""
        vol_table_collections: TableCollection = self._case.tables.filter(
            aggregation="collection", tagname="vol", iteration=self._iteration_name
        )
        vol_tables_metadata = []
        async for vol_table_name in vol_table_collections.names:
            vol_table_collection: TableCollection = self._case.tables.filter(
                aggregation="collection",
                name=vol_table_name,
                tagname="vol",
                iteration=self._iteration_name,
            )
            numerical_column_names = [
                col
                for col in vol_table_collection.columns
                if PossibleInplaceVolumetricsNumericalColumnNames.has_value(col)
            ]
            first_numerical_column_table = self.get_table(vol_table_name, numerical_column_names[0])
            categorical_column_metadata = [
                InplaceVolumetricsCategoricalMetaData(
                    name=col,
                    unique_values=pc.unique(first_numerical_column_table[col]).to_pylist(),
                )
                for col in vol_table_collection.columns
                if PossibleInplaceVolumetricsCategoricalColumnNames.has_value(col)
            ]
            vol_table_metadata = InplaceVolumetricsTableMetaData(
                name=vol_table_name,
                categorical_column_metadata=categorical_column_metadata,
                numerical_column_names=numerical_column_names,
            )

            vol_tables_metadata.append(vol_table_metadata)
        return vol_tables_metadata

    def get_table(self, table_name: str, column_name: str) -> pa.Table:
        vol_table_collection: TableCollection = self._case.tables.filter(
            aggregation="collection",
            name=table_name,
            tagname="vol",
            iteration=self._iteration_name,
            column=column_name,
        )
        if not vol_table_collection:
            print(f"No aggregated volumetric tables found {self._case_uuid}, {table_name}, {column_name}")
            print("Aggregating manually from realization tables...")
            full_table = self.temporary_aggregate_from_realization_tables(table_name)
            return full_table.select([column_name, "REAL", "FACIES", "ZONE", "REGION"])

        if len(vol_table_collection) > 1:
            raise ValueError(f"None or multiple volumetric tables found {self._case_uuid}, {table_name}, {column_name}")
        vol_table = vol_table_collection[0]
        byte_stream: BytesIO = vol_table.blob
        table: pa.Table = pq.read_table(byte_stream)
        return table

    def temporary_aggregate_from_realization_tables(self, table_name: str) -> pa.Table:
        """Temporary function to aggregate from realization tables when no aggregated table is available
        Assume Sumo will handle this in the future"""
        vol_table_collection: TableCollection = self._case.tables.filter(
            stage="realization",
            name=table_name,
            tagname="vol",
            iteration=self._iteration_name,
        )
        if not vol_table_collection:
            raise ValueError(f"No volumetric realization tables found {self._case_uuid}, {table_name}")

        ### Using ThreadPoolExecutor to parallelize the download of the tables

        def worker(idx: int) -> pd.DataFrame:
            vol_table = vol_table_collection[idx]
            print(f"Downloading table: {table_name} for realization {vol_table.realization}")
            byte_stream: BytesIO = vol_table.blob

            table: pd.DataFrame = pd.read_csv(byte_stream)
            table["REAL"] = vol_table.realization
            return table

        with ThreadPoolExecutor() as executor:
            tables = list(executor.map(worker, list(range(len(vol_table_collection)))))
            tables = pd.concat(tables)
            tables = pa.Table.from_pandas(tables)

            return tables

    def get_response(
        self,
        table_name: str,
        column_name: str,
        categorical_filters: Optional[List[InplaceVolumetricsCategoricalMetaData]] = None,
        realizations: Optional[Sequence[int]] = None,
    ) -> EnsembleScalarResponse:
        """Retrieve the volumetric response for the given table name and column name"""
        table = self.get_table(table_name, column_name)
        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)
        if categorical_filters is not None:
            for category in categorical_filters:
                mask = pc.is_in(table[category.name], value_set=pa.array(category.unique_values))
                table = table.filter(mask)
                print(table)

        summed_on_real_table = table.group_by("REAL").aggregate([(column_name, "sum")]).sort_by("REAL")

        return EnsembleScalarResponse(
            realizations=summed_on_real_table["REAL"].to_pylist(),
            values=summed_on_real_table[f"{column_name}_sum"].to_pylist(),
        )
