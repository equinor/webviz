import logging
from typing import List, Optional, Sequence, Tuple, Set

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc
from webviz_pkg.core_utils.perf_timer import PerfTimer

from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from primary.services.utils.otel_span_tracing import otel_span_decorator
from primary.services.utils.arrow_helpers import (
    find_first_non_increasing_date_pair,
    sort_table_on_real_then_date,
    is_date_column_monotonically_increasing,
)
from primary.services.service_exceptions import (
    Service,
    InvalidDataError,
    MultipleDataMatchesError,
    InvalidParameterError,
    NoDataError,
)


from ._field_metadata import create_vector_metadata_from_field_meta
from ._resampling import resample_segmented_multi_real_table, resample_single_real_table
from .generic_types import EnsembleScalarResponse
from .summary_types import Frequency, VectorInfo, RealizationVector, HistoricalVector, VectorMetadata
from ._arrow_table_loader import ArrowTableLoader
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class SummaryAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "SummaryAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    @otel_span_decorator()
    async def get_available_vectors_async(self) -> List[VectorInfo]:
        timer = PerfTimer()

        table_context = SearchContext(sumo=self._sumo_client).tables.filter(
            uuid=self._case_uuid, iteration=self._iteration_name, tagname="summary"
        )

        table_names = await table_context.names_async
        if len(table_names) == 0:
            raise NoDataError(
                f"No summary tables found in case={self._case_uuid}, iteration={self._iteration_name}", Service.SUMO
            )
        if len(table_names) > 1:
            raise MultipleDataMatchesError(
                f"Multiple summary tables found in case={self._case_uuid}, iteration={self._iteration_name}: {table_names=}",
                Service.SUMO,
            )
        column_names = await table_context.columns_async
        et_get_table_info_ms = timer.lap_ms()

        ret_info_arr: List[VectorInfo] = []
        hist_vectors: Set[str] = set()

        for vec_name in column_names:
            if vec_name == "YEARS":  # Drop the YEARS column. We do not use it.
                continue
            if vec_name not in ["DATE", "REAL"]:
                if _is_historical_vector_name(vec_name):
                    hist_vectors.add(vec_name)
                else:
                    ret_info_arr.append(VectorInfo(name=vec_name, has_historical=False))

        for info in ret_info_arr:
            hist_vec_name = _construct_historical_vector_name(info.name)
            if hist_vec_name in hist_vectors:
                info.has_historical = True

        et_build_return_info_ms = timer.lap_ms()

        LOGGER.debug(
            f"Got available vectors in: {timer.elapsed_ms()}ms "
            f"(get_table_info={et_get_table_info_ms}ms, build_return_info={et_build_return_info_ms}ms) "
            f"(total_column_count={len(column_names)})"
        )

        return ret_info_arr

    @otel_span_decorator()
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

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        # New metadata uses simulationtimeseries, but most existing cases use timeseries
        table_loader.require_content_type(["timeseries", "simulationtimeseries"])
        table = await table_loader.get_aggregated_single_column_async(vector_name)
        _validate_single_vector_table(table, vector_name)
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

    @otel_span_decorator()
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

    @otel_span_decorator()
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
        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_content_type(["timeseries", "simulationtimeseries"])
        table = await table_loader.get_single_realization_async(realization)

        # Verify that we got the expected DATE column
        if not "DATE" in table.column_names:
            raise InvalidDataError("Table does not contain a DATE column", Service.SUMO)
        date_field = table.field("DATE")
        if date_field.type != pa.timestamp("ms"):
            raise InvalidDataError(f"Unexpected type for DATE column {date_field.type=}", Service.SUMO)

        et_loading_ms = timer.lap_ms()

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

    @otel_span_decorator()
    async def get_matching_historical_vector_async(
        self,
        non_historical_vector_name: str,
        resampling_frequency: Optional[Frequency],
    ) -> Optional[HistoricalVector]:
        timer = PerfTimer()

        hist_vec_name = _construct_historical_vector_name(non_historical_vector_name)
        if not hist_vec_name:
            return None

        table_loader = ArrowTableLoader(self._sumo_client, self._case_uuid, self._iteration_name)
        table_loader.require_content_type(["timeseries", "simulationtimeseries"])
        table = await table_loader.get_aggregated_single_column_async(hist_vec_name)
        _validate_single_vector_table(table, hist_vec_name)
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


def _validate_single_vector_table(arrow_table: pa.Table, vector_name: str) -> None:

    # Verify that we got the expected columns
    if not "DATE" in arrow_table.column_names:
        raise InvalidDataError("Table does not contain a DATE column", Service.SUMO)
    if not "REAL" in arrow_table.column_names:
        raise InvalidDataError("Table does not contain a REAL column", Service.SUMO)
    if not vector_name in arrow_table.column_names:
        raise InvalidDataError(f"Table does not contain a {vector_name} column", Service.SUMO)
    if arrow_table.num_columns != 3:
        raise InvalidDataError("Table should contain exactly 3 columns", Service.SUMO)

    # Verify that we got the expected columns
    if sorted(arrow_table.column_names) != sorted(["DATE", "REAL", vector_name]):
        raise InvalidDataError(f"Unexpected columns in table {arrow_table.column_names=}", Service.SUMO)

    # Verify that the column datatypes are as we expect
    schema = arrow_table.schema
    if schema.field("DATE").type != pa.timestamp("ms"):
        raise InvalidDataError(f"Unexpected type for DATE column {schema.field('DATE').type=}", Service.SUMO)
    if schema.field("REAL").type != pa.int16():
        raise InvalidDataError(f"Unexpected type for REAL column {schema.field('REAL').type=}", Service.SUMO)
    if schema.field(vector_name).type != pa.float32():
        raise InvalidDataError(
            f"Unexpected type for {vector_name} column {schema.field(vector_name).type=}", Service.SUMO
        )


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
