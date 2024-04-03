import logging
from io import BytesIO
from typing import List, Optional, Sequence, Tuple, Set

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
from fmu.sumo.explorer.objects import Case, TableCollection, Table
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary.services.utils.arrow_helpers import sort_table_on_real_then_date, is_date_column_monotonically_increasing
from primary.services.utils.arrow_helpers import find_first_non_increasing_date_pair
from primary.services.service_exceptions import (
    Service,
    NoDataError,
    InvalidDataError,
    MultipleDataMatchesError,
    InvalidParameterError,
)


from ._field_metadata import create_vector_metadata_from_field_meta
from ._helpers import SumoEnsemble
from ._resampling import resample_segmented_multi_real_table, resample_single_real_table
from .generic_types import EnsembleScalarResponse
from .summary_types import Frequency, VectorInfo, RealizationVector, HistoricalVector, VectorMetadata

LOGGER = logging.getLogger(__name__)


class SummaryAccess(SumoEnsemble):
    async def get_available_vectors_async(self) -> List[VectorInfo]:
        timer = PerfTimer()

        # For now, only consider the collection-aggregated tables even if we will also be accessing and
        # returning data for the per-realization summary tables.
        smry_table_collection: TableCollection = self._case.tables.filter(
            tagname="summary",
            iteration=self._iteration_name,
            aggregation="collection",
            # stage="realization",
        )

        table_names = await smry_table_collection.names_async
        et_get_table_names_ms = timer.lap_ms()
        if len(table_names) == 0:
            LOGGER.warning(f"No summary tables found in case={self._case_uuid}, iteration={self._iteration_name}")
            return []
        if len(table_names) > 1:
            raise MultipleDataMatchesError(
                f"Multiple summary tables found in case={self._case_uuid}, iteration={self._iteration_name}: {table_names=}",
                Service.SUMO,
            )

        column_names = await smry_table_collection.columns_async
        et_get_column_names_ms = timer.lap_ms()

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

        LOGGER.debug(
            f"Got vector names from Sumo in: {timer.elapsed_ms()}ms "
            f"(get_table_names={et_get_table_names_ms}ms, get_column_names={et_get_column_names_ms}ms) "
            f"(total_column_count={len(column_names)})"
        )

        return ret_info_arr

    async def get_vector_table_async(
        self,
        vector_name: str,
        resampling_frequency: Optional[Frequency],
        realizations: Optional[Sequence[int]],
    ) -> Tuple[pa.Table, VectorMetadata]:
        """
        Get pyarrow.Table containing values for the specified vector and the specified realizations.
        If realizations is None, data for all available realizations will be returned.
        The returned table will always contain a 'DATE' and 'REAL' column in addition to the requested vector.
        The 'DATE' column will be of type timestamp[ms] and the 'REAL' column will be of type int16.
        The vector column will be of type float32.
        If `resampling_frequency` is None, the data will be returned with full/raw resolution.
        """
        timer = PerfTimer()

        table = await _load_all_real_arrow_table_from_sumo(self._case, self._iteration_name, vector_name)
        et_loading_ms = timer.lap_ms()

        if realizations is not None:
            requested_reals_arr = pa.array(realizations)
            mask = pc.is_in(table["REAL"], value_set=requested_reals_arr)
            table = table.filter(mask)

            # Verify that we got data for all the requested realizations
            # Wait a little before enabling this test until we have proper error propagation to client in place
            # reals_without_data = detect_missing_realizations(table, requested_reals_arr)
            # if reals_without_data:
            #     raise NoDataError(f"No data in some requested realizations, {reals_without_data=}", Service.SUMO)

        # Our assumption is that the table is segmented on REAL and that within each segment,
        # the DATE column is sorted. We may want to add some checks here to verify this assumption since the
        # resampling algorithm below assumes this and will fail if it is not true.
        # ...or just sort it unconditionally here
        table = sort_table_on_real_then_date(table)

        # The resampling algorithm below uses the field metadata to determine if the vector is a rate or not.
        # For now, fail hard if metadata is not present. This test could be refined, but should suffice now.
        vector_metadata = create_vector_metadata_from_field_meta(table.schema.field(vector_name))
        if not vector_metadata:
            raise InvalidDataError(f"Did not find valid metadata for vector {vector_name}", Service.SUMO)

        # Do the actual resampling
        timer.lap_ms()
        if resampling_frequency is not None:
            table = resample_segmented_multi_real_table(table, resampling_frequency)
        et_resampling_ms = timer.lap_ms()

        # Should we always combine the chunks?
        table = table.combine_chunks()

        LOGGER.debug(
            f"Got summary vector data from Sumo in: {timer.elapsed_ms()}ms "
            f"(loading={et_loading_ms}ms, resampling={et_resampling_ms}ms) "
            f"({vector_name=} {resampling_frequency=} {table.shape=})"
        )

        return table, vector_metadata

    async def get_vector_async(
        self,
        vector_name: str,
        resampling_frequency: Optional[Frequency],
        realizations: Optional[Sequence[int]],
    ) -> List[RealizationVector]:
        table, vector_metadata = await self.get_vector_table_async(vector_name, resampling_frequency, realizations)

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

    async def get_single_real_vectors_table_async(
        self,
        vector_names: Sequence[str],
        resampling_frequency: Optional[Frequency],
        realization: int,
    ) -> Tuple[pa.Table, List[VectorMetadata]]:
        """
        Get pyarrow.Table containing values for the specified vectors and the single specified realization.
        This function will fetch per-realization summary data from Sumo, thereby downloading data only for the
        specified realization, BUT it will download all the vector columns in the process.
        The returned table will always contain a 'DATE' column in addition to the requested vectors.
        The 'DATE' column will be of type timestamp[ms].
        The vector columns will be of type float32.
        If `resampling_frequency` is None, the data will be returned with full/raw resolution.
        """
        if not vector_names:
            raise InvalidParameterError("List of requested vector names is empty", Service.SUMO)

        timer = PerfTimer()

        full_table: pa.Table = await _load_single_real_full_arrow_table_from_sumo(
            self._case, self._iteration_name, realization
        )
        et_loading_ms = timer.lap_ms()

        columns_to_get = ["DATE"]
        columns_to_get.extend(vector_names)
        table = full_table.select(columns_to_get)

        # Verify that the column datatypes are as we expect
        schema = table.schema
        for vector_name in vector_names:
            if schema.field(vector_name).type != pa.float32():
                raise InvalidDataError(
                    f"Unexpected type for {vector_name} column {schema.field(vector_name).type=}", Service.SUMO
                )

        # The resampling function requires that the table is sorted on the DATE column
        if not is_date_column_monotonically_increasing(table):
            error_pair = find_first_non_increasing_date_pair(table)
            raise InvalidDataError(
                f"DATE column must be monotonically increasing, first offending timestamps: {error_pair}", Service.SUMO
            )

        # The resampling algorithm below uses the field metadata to determine if the vector is a rate or not.
        # For now, fail hard if metadata is not present.
        vector_metadata_list: List[VectorMetadata] = []
        for vector_name in vector_names:
            vector_metadata = create_vector_metadata_from_field_meta(schema.field(vector_name))
            if not vector_metadata:
                raise InvalidDataError(f"Did not find valid metadata for vector {vector_name}", Service.SUMO)
            vector_metadata_list.append(vector_metadata)
        et_preparing_ms = timer.lap_ms()

        # Do the actual resampling
        if resampling_frequency is not None:
            table = resample_single_real_table(table, resampling_frequency)
        et_resampling_ms = timer.lap_ms()

        LOGGER.debug(
            f"Got single realization summary data for {len(vector_names)} vectors from Sumo in: {timer.elapsed_ms()}ms "
            f"(loading={et_loading_ms}ms, preparing={et_preparing_ms}ms, resampling={et_resampling_ms}ms) "
            f"({realization=}, {resampling_frequency=}, {table.shape=})"
        )

        return table, vector_metadata_list

    async def get_matching_historical_vector_async(
        self,
        non_historical_vector_name: str,
        resampling_frequency: Optional[Frequency],
    ) -> Optional[HistoricalVector]:
        timer = PerfTimer()

        hist_vec_name = _construct_historical_vector_name(non_historical_vector_name)
        if not hist_vec_name:
            return None

        table = await _load_all_real_arrow_table_from_sumo(self._case, self._iteration_name, hist_vec_name)
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
            raise InvalidDataError(f"Did not find valid metadata for vector {hist_vec_name}", Service.SUMO)

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

    async def get_vector_values_at_timestamp_async(
        self,
        vector_name: str,
        timestamp_utc_ms: int,
        realizations: Optional[Sequence[int]] = None,
    ) -> EnsembleScalarResponse:
        table, _ = await self.get_vector_table_async(vector_name, resampling_frequency=None, realizations=realizations)

        if realizations is not None:
            mask = pc.is_in(table["REAL"], value_set=pa.array(realizations))
            table = table.filter(mask)
        mask = pc.is_in(table["DATE"], value_set=pa.array([timestamp_utc_ms]))
        table = table.filter(mask)

        return EnsembleScalarResponse(
            realizations=table["REAL"].to_pylist(),
            values=table[vector_name].to_pylist(),
        )

    async def get_timestamps_async(
        self,
        resampling_frequency: Optional[Frequency] = None,
    ) -> List[int]:
        """
        Get list of available timestamps in ms UTC
        """
        table, _ = await self.get_vector_table_async(
            (await self.get_available_vectors_async())[0].name,
            resampling_frequency=resampling_frequency,
            realizations=None,
        )

        return pc.unique(table.column("DATE")).to_numpy().astype(int).tolist()


async def _load_all_real_arrow_table_from_sumo(case: Case, iteration_name: str, vector_name: str) -> pa.Table:
    timer = PerfTimer()

    sumo_table = await _locate_all_real_combined_sumo_table(case, iteration_name, column_name=vector_name)
    et_locate_ms = timer.lap_ms()

    # print(f"{sumo_table.format=}")
    # print(f"{sumo_table.name=}")
    # print(f"{sumo_table.tagname=}")

    table: pa.Table = await sumo_table.to_arrow_async()
    et_download_and_read_ms = timer.lap_ms()

    # Verify that we got the expected columns
    if not "DATE" in table.column_names:
        raise InvalidDataError("Table does not contain a DATE column", Service.SUMO)
    if not "REAL" in table.column_names:
        raise InvalidDataError("Table does not contain a REAL column", Service.SUMO)
    if not vector_name in table.column_names:
        raise InvalidDataError(f"Table does not contain a {vector_name} column", Service.SUMO)
    if table.num_columns != 3:
        raise InvalidDataError("Table should contain exactly 3 columns", Service.SUMO)

    # Verify that we got the expected columns
    if sorted(table.column_names) != sorted(["DATE", "REAL", vector_name]):
        raise InvalidDataError(f"Unexpected columns in table {table.column_names=}", Service.SUMO)

    # Verify that the column datatypes are as we expect
    schema = table.schema
    if schema.field("DATE").type != pa.timestamp("ms"):
        raise InvalidDataError(f"Unexpected type for DATE column {schema.field('DATE').type=}", Service.SUMO)
    if schema.field("REAL").type != pa.int16():
        raise InvalidDataError(f"Unexpected type for REAL column {schema.field('REAL').type=}", Service.SUMO)
    if schema.field(vector_name).type != pa.float32():
        raise InvalidDataError(
            f"Unexpected type for {vector_name} column {schema.field(vector_name).type=}", Service.SUMO
        )

    # The call above has already downloaded and cached the raw blob, just use this to get the data size
    blob_size_mb = _try_to_determine_blob_size_mb(sumo_table.blob)

    LOGGER.debug(
        f"Loaded all realizations arrow table from Sumo in: {timer.elapsed_ms()}ms "
        f"(locate={et_locate_ms}ms, download_and_read={et_download_and_read_ms}ms) "
        f"({vector_name=}, {table.shape=}, {blob_size_mb=:.2f})"
    )

    return table


async def _load_single_real_full_arrow_table_from_sumo(case: Case, iteration_name: str, realization: int) -> pa.Table:
    timer = PerfTimer()

    sumo_table: Table = await _locate_single_real_sumo_table(case, iteration_name, realization)
    et_locate_ms = timer.lap_ms()

    # print(f"{sumo_table.format=}")
    # print(f"{sumo_table.name=}")
    # print(f"{sumo_table.tagname=}")
    # print(f"{sumo_table.context=}")
    # print(f"{sumo_table.stage=}")
    # print(f"{sumo_table.aggregation=}")

    # Note that this will download and load the entire table into memory regardless
    # of which columns in the table we will actually use.
    table: pa.Table = await sumo_table.to_arrow_async()
    et_download_and_read_ms = timer.lap_ms()

    # Verify that we got the expected DATE column and no REAL column
    if not "DATE" in table.column_names:
        raise InvalidDataError("Table does not contain a DATE column", Service.SUMO)
    date_field: pa.Field = table.field("DATE")
    if date_field.type != pa.timestamp("ms"):
        raise InvalidDataError(f"Unexpected type for DATE column {date_field.type=}", Service.SUMO)

    if "REAL" in table.column_names:
        raise InvalidDataError("Table contains an unexpected REAL column", Service.SUMO)

    # The call above has already downloaded and cached the raw blob, just use this to get the data size
    blob_size_mb = _try_to_determine_blob_size_mb(sumo_table.blob)

    LOGGER.debug(
        f"Loaded single realization arrow table from Sumo in: {timer.elapsed_ms()}ms "
        f"(locate={et_locate_ms}ms, download_and_read={et_download_and_read_ms}ms) "
        f"({realization=}, {table.shape=}, {blob_size_mb=:.2f})"
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


async def _locate_all_real_combined_sumo_table(case: Case, iteration_name: str, column_name: str) -> Table:
    """Locate sumo table that has concatenated summary data for all realizations for a single vector"""
    table_collection = case.tables.filter(
        tagname="summary",
        stage="iteration",
        aggregation="collection",
        iteration=iteration_name,
        column=column_name,
    )

    table_names = await table_collection.names_async
    if len(table_names) == 0:
        raise NoDataError(f"No summary tables with collection aggregation found: {column_name=}", Service.SUMO)
    if len(table_names) > 1:
        raise MultipleDataMatchesError(
            f"Multiple summary tables with collection aggregation found: {column_name=}, {table_names=}", Service.SUMO
        )

    return await table_collection.getitem_async(0)


async def _locate_single_real_sumo_table(case: Case, iteration_name: str, realization: int) -> Table:
    """Locate the sumo table with summary data for all vectors for the for the specified single realization"""
    table_collection: TableCollection = case.tables.filter(
        tagname="summary",
        stage="realization",
        iteration=iteration_name,
        realization=realization,
    )

    table_names = await table_collection.names_async
    if len(table_names) == 0:
        raise NoDataError(f"No summary tables found for realization {realization=}", Service.SUMO)
    if len(table_names) > 1:
        raise MultipleDataMatchesError(
            f"Multiple summary tables found for realization {realization=}, {table_names=}", Service.SUMO
        )

    return await table_collection.getitem_async(0)


def _try_to_determine_blob_size_mb(blob: BytesIO) -> float:
    if blob and hasattr(blob, "getbuffer"):
        return blob.getbuffer().nbytes / (1024 * 1024)

    return -1
