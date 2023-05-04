import datetime
import logging
from io import BytesIO
from typing import List, Optional, Sequence, Tuple

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.compute as pc
from fmu.sumo.explorer.objects import CaseCollection
from sumo.wrapper import SumoClient

from src.services.utils.arrow_helpers import sort_table_on_real_then_date
from src.services.utils.perf_timer import PerfTimer
from ._field_metadata import create_vector_metadata_from_field_meta
from ._helpers import create_sumo_client_instance
from ._resampling import resample_segmented_multi_real_table
from .types import Frequency, RealizationVector, VectorMetadata
from .generic_types import EnsembleScalarResponse

LOGGER = logging.getLogger(__name__)


class SummaryAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name

    def get_vector_names(self) -> List[str]:
        timer = PerfTimer()

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]
        smry_table_collection = case.tables.filter(
            aggregation="collection",
            name="summary",
            tagname="eclipse",
            iteration=self._iteration_name,
        )

        column_names = smry_table_collection.columns
        vec_names = [name for name in column_names if name not in ["DATE", "REAL"]]

        LOGGER.debug(f"Got vector names from Sumo in: {timer.elapsed_ms()}ms")

        return vec_names

    def get_vector_table(
        self,
        vector_name: str,
        resampling_frequency: Optional[Frequency],
        realizations: Optional[Sequence[int]],
    ) -> Tuple[pa.Table, VectorMetadata]:
        """
        Get pyarrow.Table containing values for the specified vector.
        The returned table will always contain a 'DATE' and 'REAL' column in addition to the requested vector.
        The 'DATE' column will be of type timestamp[ms] and the 'REAL' column will be of type int16.
        The vector column will be of type float32.
        If `resampling_frequency` is None, the data will be returned with full/raw resolution.
        """
        timer = PerfTimer()

        case_collection = CaseCollection(self._sumo_client).filter(uuid=self._case_uuid)
        if len(case_collection) != 1:
            raise ValueError(f"None or multiple sumo cases found {self._case_uuid=}")

        case = case_collection[0]
        et_get_case_ms = timer.lap_ms()

        smry_table_collection = case.tables.filter(
            aggregation="collection",
            name="summary",
            tagname="eclipse",
            iteration=self._iteration_name,
            column=vector_name,
        )
        if len(smry_table_collection) == 0:
            raise ValueError(f"No table found for vector {vector_name=}")
        if len(smry_table_collection) > 1:
            raise ValueError(f"Multiple tables found for vector {vector_name=}")

        sumo_table = smry_table_collection[0]
        # print(f"{sumo_table.format=}")
        et_locate_sumo_table_ms = timer.lap_ms()

        # Now, read as an arrow table
        # Note!!!
        # The tables we have seen so far have format set to 'arrow', but the actual data is in parquet format.
        # This must be a bug or a misunderstanding.
        # For now, just read the parquet data into an arrow table
        byte_stream: BytesIO = sumo_table.blob
        table = pq.read_table(byte_stream)
        et_get_table_data_ms = timer.lap_ms()

        # Verify that we got the expected columns
        if not "DATE" in table.column_names:
            raise ValueError("Table does not contain a DATE column")
        if not "REAL" in table.column_names:
            raise ValueError("Table does not contain a REAL column")
        if not vector_name in table.column_names:
            raise ValueError(f"Table does not contain a {vector_name} column")
        if table.num_columns != 3:
            raise ValueError("Table should contain exactly 3 columns")

        # Verify that we got the expected columns
        if sorted(table.column_names) != sorted(["DATE", "REAL", vector_name]):
            raise ValueError(f"Unexpected columns in table {table.column_names=}")

        # Verify that the column datatypes are as we expect
        schema = table.schema
        if schema.field("DATE").type != pa.timestamp("ms"):
            raise ValueError(f"Unexpected type for DATE column {schema.field('DATE').type=}")
        if schema.field("REAL").type != pa.int16():
            raise ValueError(f"Unexpected type for REAL column {schema.field('REAL').type=}")
        if schema.field(vector_name).type != pa.float32():
            raise ValueError(f"Unexpected type for {vector_name} column {schema.field(vector_name).type=}")

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)

        # Our assumption is that the table is segmented on REAL and that within each segment,
        # the DATE column is sorted. We may want to add some checks here to verify this assumption since the
        # resampling algorithm below assumes this and will fail if it is not true.

        # ...or just sort it unconditionally here
        table = sort_table_on_real_then_date(table)

        # The resampling algorithm below uses the field metadata to determine if the vector is a rate or not.
        # For now, fail hard if metadata is not present. This test could be refined, but should suffice now.
        vector_metadata = create_vector_metadata_from_field_meta(table.schema.field(vector_name))
        if not vector_metadata:
            raise ValueError(f"Did not find valid metadata for vector {vector_name}")

        # Do the actual resampling
        timer.lap_ms()
        if resampling_frequency is not None:
            table = resample_segmented_multi_real_table(table, resampling_frequency)
        et_resampling_ms = timer.lap_ms()

        # Should we always combine the chunks?
        table = table.combine_chunks()

        LOGGER.debug(
            f"Got vector table from Sumo in: {timer.elapsed_ms()}ms ("
            f"get_case={et_get_case_ms}ms, "
            f"locate_sumo_table={et_locate_sumo_table_ms}ms, "
            f"get_table_data={et_get_table_data_ms}ms, "
            f"resampling={et_resampling_ms}ms) "
            f"{resampling_frequency=} {table.shape=}"
        )

        return table, vector_metadata

    def get_vector(
        self,
        vector_name: str,
        resampling_frequency: Optional[Frequency],
        realizations: Optional[Sequence[int]],
    ) -> List[RealizationVector]:
        table, vector_metadata = self.get_vector_table(vector_name, resampling_frequency, realizations)

        real_arr_np = table.column("REAL").to_numpy()
        unique_reals, first_occurrence_idx, real_counts = np.unique(real_arr_np, return_index=True, return_counts=True)

        whole_date_np_arr = table.column("DATE").to_numpy()
        whole_value_np_arr = table.column(vector_name).to_numpy()

        ret_arr: List[RealizationVector] = []
        for i, real in enumerate(unique_reals):
            start_row_idx = first_occurrence_idx[i]
            row_count = real_counts[i]
            date_np_arr = whole_date_np_arr[start_row_idx : start_row_idx + row_count]
            value_np_arr = whole_value_np_arr[start_row_idx : start_row_idx + row_count]

            ret_arr.append(
                RealizationVector(
                    realization=real,
                    timestamps=date_np_arr.astype(datetime.datetime).tolist(),
                    values=value_np_arr.tolist(),
                    metadata=vector_metadata,
                )
            )

        return ret_arr

    def get_vector_values_at_timestep(
        self,
        vector_name: str,
        timestep: datetime.datetime,
        realizations: Optional[Sequence[int]] = None,
    ) -> EnsembleScalarResponse:
        table, _ = self.get_vector_table(vector_name, resampling_frequency=None, realizations=realizations)

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)
        mask = pc.is_in(table["DATE"], value_set=pa.array([timestep]))
        table = table.filter(mask)

        return EnsembleScalarResponse(
            realizations=table["REAL"].to_pylist(),
            values=table[vector_name].to_pylist(),
        )

    def get_timesteps(
        self,
        resampling_frequency: Optional[Frequency] = None,
    ) -> List[datetime.datetime]:
        table, _ = self.get_vector_table(
            self.get_vector_names()[0], resampling_frequency=resampling_frequency, realizations=None
        )

        return pc.unique(table.column("DATE")).to_pylist()
