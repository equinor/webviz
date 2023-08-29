import logging
from io import BytesIO
from typing import List, Optional, Sequence, Tuple, Set

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.parquet as pq
from fmu.sumo.explorer.objects import CaseCollection, Case
from sumo.wrapper import SumoClient

from src.services.utils.arrow_helpers import sort_table_on_real_then_date
from src.services.utils.perf_timer import PerfTimer

from ._field_metadata import create_vector_metadata_from_field_meta
from ._helpers import create_sumo_client_instance
from ._resampling import resample_segmented_multi_real_table
from .generic_types import EnsembleScalarResponse
from .summary_types import Frequency, VectorInfo, RealizationVector, HistoricalVector, VectorMetadata

LOGGER = logging.getLogger(__name__)


class SummaryAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        sumo_client: SumoClient = create_sumo_client_instance(access_token)
        case_collection = CaseCollection(sumo_client).filter(uuid=case_uuid)
        if len(case_collection) == 0:
            raise ValueError(f"Could not find sumo cases {case_uuid=}")
        if len(case_collection) > 1:
            raise ValueError(f"Multiple sumo cases found {case_uuid=}")

        self._case: Case = case_collection[0]
        self._iteration_name: str = iteration_name

    def get_available_vectors(self) -> List[VectorInfo]:
        timer = PerfTimer()

        smry_table_collection = self._case.tables.filter(
            aggregation="collection",
            name="summary",
            tagname="eclipse",
            iteration=self._iteration_name,
        )

        column_names = smry_table_collection.columns

        ret_info_arr: List[VectorInfo] = []
        hist_vectors: Set[str] = set()

        for vec_name in column_names:
            if vec_name not in ["DATE", "REAL"]:
                if _is_historical_vector_name(vec_name):
                    hist_vectors.add(vec_name)
                else:
                    ret_info_arr.append(VectorInfo(name=vec_name, has_historical=False))

        for info in ret_info_arr:
            hist_vec_name = _construct_historical_vector_name(info.name)
            if hist_vec_name in hist_vectors:
                info.has_historical = True

        LOGGER.debug(f"Got vector names from Sumo in: {timer.elapsed_ms()}ms")

        return ret_info_arr

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

        table = _load_arrow_table_for_from_sumo(self._case, self._iteration_name, vector_name)
        if table is None:
            raise ValueError(f"No table found for vector {vector_name=}")
        et_loading_ms = timer.lap_ms()

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
            f"loading={et_loading_ms}ms, "
            f"resampling={et_resampling_ms}ms) "
            f"{vector_name=} {resampling_frequency=} {table.shape=}"
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
                    timestamps_utc_ms=date_np_arr.astype(int).tolist(),
                    values=value_np_arr.tolist(),
                    metadata=vector_metadata,
                )
            )

        return ret_arr

    def get_matching_historical_vector(
        self,
        non_historical_vector_name: str,
        resampling_frequency: Optional[Frequency],
    ) -> Optional[HistoricalVector]:

        timer = PerfTimer()

        hist_vec_name = _construct_historical_vector_name(non_historical_vector_name)
        if not hist_vec_name:
            return None

        table = _load_arrow_table_for_from_sumo(self._case, self._iteration_name, hist_vec_name)
        if table is None:
            return None
        et_load_table_ms = timer.lap_ms()

        # Use data from the first realization
        realization_to_use = pc.min((table["REAL"]))
        mask = pc.equal(table["REAL"], realization_to_use)
        table = table.filter(mask)

        # Resampling assumes table is segmented on REAL and that within each segment the DATE column is sorted.
        # By now we only have one real, so just sort on DAT
        table = table.sort_by([("DATE", "ascending")])

        # Need metadata both for resampling and return value
        vector_metadata = create_vector_metadata_from_field_meta(table.schema.field(hist_vec_name))
        if not vector_metadata:
            raise ValueError(f"Did not find valid metadata for vector {hist_vec_name}")

        # Do the actual resampling
        if resampling_frequency is not None:
            table = resample_segmented_multi_real_table(table, resampling_frequency)

        date_np_arr = table.column("DATE").to_numpy()
        value_np_arr = table.column(hist_vec_name).to_numpy()

        et_processing = timer.lap_ms()

        LOGGER.debug(
            f"Got historical vector in: {timer.elapsed_ms()}ms ("
            f"load_table={et_load_table_ms}ms, "
            f"processing={et_processing}ms, "
            f"{resampling_frequency=} {table.shape=}"
        )

        return HistoricalVector(
            timestamps_utc_ms=date_np_arr.astype(int).tolist(),
            values=value_np_arr.tolist(),
            metadata=vector_metadata,
        )

    def get_vector_values_at_timestamp(
        self,
        vector_name: str,
        timestamp_utc_ms: int,
        realizations: Optional[Sequence[int]] = None,
    ) -> EnsembleScalarResponse:
        table, _ = self.get_vector_table(vector_name, resampling_frequency=None, realizations=realizations)

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)
        mask = pc.is_in(table["DATE"], value_set=pa.array([timestamp_utc_ms]))
        table = table.filter(mask)

        return EnsembleScalarResponse(
            realizations=table["REAL"].to_pylist(),
            values=table[vector_name].to_pylist(),
        )

    def get_timestamps(
        self,
        resampling_frequency: Optional[Frequency] = None,
    ) -> List[int]:
        """
        Get list of available timestamps in ms UTC
        """
        table, _ = self.get_vector_table(
            self.get_available_vectors()[0].name,
            resampling_frequency=resampling_frequency,
            realizations=None,
        )

        return pc.unique(table.column("DATE")).to_numpy().astype(int).tolist()


def _load_arrow_table_for_from_sumo(case: Case, iteration_name: str, vector_name: str) -> Optional[pa.Table]:
    timer = PerfTimer()

    smry_table_collection = case.tables.filter(
        aggregation="collection",
        name="summary",
        tagname="eclipse",
        iteration=iteration_name,
        column=vector_name,
    )
    if len(smry_table_collection) == 0:
        return None
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
    et_download_arrow_table_ms = timer.lap_ms()

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

    LOGGER.debug(
        f"Loaded arrow table from Sumo in: {timer.elapsed_ms()}ms ("
        f"locate_sumo_table={et_locate_sumo_table_ms}ms, "
        f"download_arrow_table={et_download_arrow_table_ms}ms) "
        f"{vector_name=} {table.shape=}"
    )

    return table


def _is_historical_vector_name(vector_name: str) -> bool:
    parts = vector_name.split(":", 1)
    if parts[0].endswith("H") and parts[0].startswith(("F", "G", "W")):
        return True

    return False


def _construct_historical_vector_name(non_historical_vector_name: str) -> Optional[str]:
    parts = non_historical_vector_name.split(":", 1)
    parts[0] += "H"
    hist_vec = ":".join(parts)
    if _is_historical_vector_name(hist_vec):
        return hist_vec

    return None
