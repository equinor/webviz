import asyncio
import logging

import pyarrow as pa
from fmu.sumo.explorer.explorer import SearchContext, SumoClient
from fmu.sumo.explorer.objects import Table

from webviz_core_utils.perf_metrics import PerfMetrics
from webviz_services.service_exceptions import (
    InvalidDataError,
    InvalidParameterError,
    MultipleDataMatchesError,
    NoDataError,
    Service,
    ServiceLayerException,
)

LOGGER = logging.getLogger(__name__)


class ArrowTableLoader:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._req_table_name: str | None = None
        self._req_content_types: list[str] | None = None
        self._req_tagname: str | None = None
        self._req_standard_result: str | None = None

    def require_table_name(self, table_name: str) -> None:
        self._req_table_name = table_name

    def require_content_type(self, content_type: str | list[str]) -> None:
        self._req_content_types = content_type if isinstance(content_type, list) else [content_type]

    def require_tagname(self, tagname: str) -> None:
        self._req_tagname = tagname

    def require_standard_result(self, standard_result: str) -> None:
        self._req_standard_result = standard_result

    # ── Per-column aggregation (uses SDK aggregate_async — no ES consistency issues) ──────

    async def get_aggregated_single_column_async(
        self,
        column_name: str,
    ) -> pa.Table:
        """Filters for a single table and column, aggregates the column (if it does not already exist),
        and returns the result as an Arrow table"""

        perf_metrics = PerfMetrics()

        sc_tables_basis = SearchContext(sumo=self._sumo_client).tables.filter(
            uuid=self._case_uuid,
            ensemble=self._ensemble_name,
            column=column_name,
            name=self._req_table_name,
            content=self._req_content_types,
            tagname=self._req_tagname,
            standard_result=self._req_standard_result,
        )

        sc_existing_agg_tables = sc_tables_basis.filter(aggregation="collection", realization=False)
        existing_agg_table_count = await sc_existing_agg_tables.length_async()
        perf_metrics.record_lap("locate")

        if existing_agg_table_count > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for: {self._make_req_info_str()}", Service.SUMO)

        sumo_table_obj: Table | None = None

        if existing_agg_table_count == 1:
            # We're probably good and have an already aggregated table, but we also need to check if the
            # aggregation has become stale with regards to the underlying realizations.
            # Since we assume that most of the time we will have valid aggregations, we optimistically do
            # fetching of the blob payload contents and validation concurrently.
            existing_agg_table_obj: Table = await sc_existing_agg_tables.getitem_async(0)
            perf_metrics.record_lap("get-sumo-obj")

            async with asyncio.TaskGroup() as tg:
                tg.create_task(existing_agg_table_obj.blob_async)
                validate_task = tg.create_task(_is_agg_valid_for_reals_async(existing_agg_table_obj, sc_tables_basis))
            perf_metrics.record_lap("fetch-and-validate")

            if validate_task.result():
                sumo_table_obj = existing_agg_table_obj
            else:
                LOGGER.debug(
                    f"ArrowTableLoader.get_aggregated_single_column() found stale aggregation for: {column_name=}, {self._make_req_info_str()}"
                )

        if not sumo_table_obj:
            # No valid aggregated table exists for the column, we need to aggregate it
            LOGGER.debug(
                f"ArrowTableLoader.get_aggregated_single_column() doing aggregation for: {column_name=}, {self._make_req_info_str()}"
            )

            sc_agg_input_tables = sc_tables_basis.filter(aggregation=False, realization=True)

            # If we have a wildcard table name, we must ensure that we're down to a single table name in the search context
            if self._req_table_name is None:
                existing_agg_table_names = await sc_existing_agg_tables.names_async
                if len(existing_agg_table_names) > 1:
                    raise MultipleDataMatchesError(
                        f"Multiple tables found for {self._make_req_info_str()}", Service.SUMO
                    )

            if await sc_agg_input_tables.length_async() == 0:
                raise NoDataError(
                    f"No per-realization tables found for: {column_name=}, {self._make_req_info_str()}", Service.SUMO
                )

            # Does the aggregation and gets the blob (also writes the resulting aggregation back into Sumo)
            new_agg_table_obj = await sc_agg_input_tables.aggregate_async(columns=[column_name], operation="collection")
            if not isinstance(new_agg_table_obj, Table):
                raise InvalidDataError(
                    f"Failed to get aggregated object for: {column_name=}, {self._make_req_info_str()}", Service.SUMO
                )
            sumo_table_obj = new_agg_table_obj
            perf_metrics.record_lap("aggregate")

        arrow_table: pa.Table = await sumo_table_obj.to_arrow_async()
        perf_metrics.record_lap("to-arrow")

        LOGGER.debug(
            f"ArrowTableLoader.get_aggregated_single_column() took: {perf_metrics.to_string()}, {column_name=}, {self._make_req_info_str()}"
        )

        return arrow_table

    async def get_aggregated_multiple_columns_async(
        self,
        column_names: list[str],
    ) -> pa.Table:
        """
        Fetches aggregated table for multiple columns async and assembles them into a single Arrow table
        """
        if not column_names:
            raise InvalidParameterError(
                f"Cannot fetch aggregated tables for empty column list: {self._make_req_info_str()}", Service.SUMO
            )

        # Fetch the aggregated table for each column
        try:
            async with asyncio.TaskGroup() as tg:
                column_name_and_task_pairs = [
                    (column_name, tg.create_task(self.get_aggregated_single_column_async(column_name)))
                    for column_name in column_names
                ]

            column_name_and_aggregated_table_pairs = [
                (name, task.result()) for name, task in column_name_and_task_pairs
            ]

        except* ServiceLayerException as exc_group:
            for exc in exc_group.exceptions:
                raise exc from exc_group  # Reraise the first exception

        # If we only have one table, we can just return it directly
        if len(column_name_and_aggregated_table_pairs) == 1:
            return column_name_and_aggregated_table_pairs[0][1]

        # Since we're going to just append the "value" columns below, we need to ensure that the shared columns
        # (the columns that are not in column_names) are equal across all tables.
        first_column_name, first_aggregated_table = column_name_and_aggregated_table_pairs[0]
        shared_columns_first_table = first_aggregated_table.drop(first_column_name)
        for i in range(1, len(column_name_and_aggregated_table_pairs)):
            this_column_name, this_aggregated_table = column_name_and_aggregated_table_pairs[i]
            shared_columns_this_table = this_aggregated_table.drop(this_column_name)
            if not shared_columns_first_table.equals(shared_columns_this_table):
                if shared_columns_first_table.column_names != shared_columns_this_table.column_names:
                    raise InvalidDataError(
                        f"The shared columns are not equal: Aggregated table for {first_column_name} has shared columns {shared_columns_first_table.column_names}, and aggregated table for {this_column_name} has shared columns {shared_columns_this_table.column_names}",
                        Service.SUMO,
                    )
                raise InvalidDataError(
                    f"The shared columns are not equal: Aggregated table for {first_column_name} and aggregated table for {this_column_name} has same shared columns {shared_columns_this_table.column_names}. Although the column names match, their contents (values or order) differ.",
                    Service.SUMO,
                )

        # Now we can merge the tables by appending the "value" columns
        merged_aggregated_table = first_aggregated_table
        for i in range(1, len(column_name_and_aggregated_table_pairs)):
            column_name, aggregated_table = column_name_and_aggregated_table_pairs[i]
            merged_aggregated_table = merged_aggregated_table.append_column(column_name, aggregated_table[column_name])

        return merged_aggregated_table

    # ── Batch aggregation (uses SDK batch_aggregate_async — requires ES index fetch with retry) ──

    def _make_base_search_context(self) -> SearchContext:
        return SearchContext(sumo=self._sumo_client).tables.filter(
            uuid=self._case_uuid,
            ensemble=self._ensemble_name,
            name=self._req_table_name,
            content=self._req_content_types,
            tagname=self._req_tagname,
            standard_result=self._req_standard_result,
        )

    async def find_columns_needing_aggregation_async(
        self,
        column_names: list[str],
    ) -> list[str]:
        """Check which columns need aggregation (missing or stale).

        Returns the subset of column_names that do NOT have valid existing
        aggregations in Sumo.  If the returned list is empty, all columns
        are already aggregated and can be fetched directly.
        """
        if not column_names:
            return []

        sc_base = self._make_base_search_context()
        sc_all_agg = sc_base.filter(aggregation="collection", realization=False)

        existing_agg_columns: set[str] = set(await sc_all_agg.columns_async)

        cols_with_agg = [c for c in column_names if c in existing_agg_columns]
        cols_without_agg = [c for c in column_names if c not in existing_agg_columns]

        # Validate existing aggregations concurrently
        if cols_with_agg:
            try:
                async with asyncio.TaskGroup() as tg:
                    validate_tasks = {
                        col: tg.create_task(self._check_agg_is_valid_async(col, sc_base)) for col in cols_with_agg
                    }
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group

            for col, task in validate_tasks.items():
                if not task.result():
                    cols_without_agg.append(col)

        return cols_without_agg

    async def _check_agg_is_valid_async(self, column_name: str, sc_base: SearchContext) -> bool:
        """Check if a valid aggregation exists for a column. Does NOT fetch the blob."""
        sc_col_agg = sc_base.filter(column=column_name, aggregation="collection", realization=False)

        agg_count = await sc_col_agg.length_async()
        if agg_count != 1:
            return False

        agg_table_obj: Table = await sc_col_agg.getitem_async(0)
        return await _is_agg_valid_for_reals_async(agg_table_obj, sc_base.filter(column=column_name))

    async def get_aggregated_columns_batched_async(
        self,
        column_names: list[str],
        expect_all_aggregated: bool = False,
    ) -> dict[str, pa.Table]:
        """Fetch aggregated tables for multiple columns with optimized batching.

        Compared to calling get_aggregated_single_column_async per column, this:
        - Uses a single query to discover which columns already have aggregations
        - Shares the realization count query across all staleness checks

        If expect_all_aggregated is True (e.g. after a batch_aggregate task completed),
        the discovery and staleness-validation steps are skipped and all columns are
        fetched directly with retry to handle Elasticsearch eventual consistency.

        Returns dict mapping column_name -> pa.Table (each with DATE, REAL, column_name).
        """
        if not column_names:
            raise InvalidParameterError("Empty column list", Service.SUMO)

        perf_metrics = PerfMetrics()
        sc_base = self._make_base_search_context()

        if expect_all_aggregated:
            results = await self._fetch_expected_aggregations_async(column_names, sc_base, perf_metrics)
            LOGGER.debug(
                f"ArrowTableLoader.get_aggregated_columns_batched_async(expect_all_aggregated) "
                f"took: {perf_metrics.to_string()}, columns={column_names}, {self._make_req_info_str()}"
            )
            return results

        # Batch-locate existing aggregations (1 query instead of N)
        sc_all_agg = sc_base.filter(aggregation="collection", realization=False)

        existing_agg_columns: set[str] = set(await sc_all_agg.columns_async)
        perf_metrics.record_lap("batch-locate")

        cols_with_agg = [c for c in column_names if c in existing_agg_columns]
        cols_without_agg = [c for c in column_names if c not in existing_agg_columns]

        results: dict[str, pa.Table] = {}

        # Fetch and validate existing aggregations concurrently
        if cols_with_agg:
            try:
                async with asyncio.TaskGroup() as tg:
                    fetch_tasks = {
                        col: tg.create_task(self._fetch_and_validate_agg_async(col, sc_base)) for col in cols_with_agg
                    }
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group

            for col, task in fetch_tasks.items():
                result = task.result()
                if result is not None:
                    results[col] = result
                else:
                    cols_without_agg.append(col)

            perf_metrics.record_lap("fetch-validate-existing")

        # Aggregate columns that are missing or have stale aggregations.
        # Uses batch_aggregate_async to submit a single Sumo request for all
        # columns that need aggregation, instead of one request per column.
        if cols_without_agg:
            LOGGER.info(
                f"ArrowTableLoader.get_aggregated_columns_batched_async() aggregating {len(cols_without_agg)} columns: "
                f"{cols_without_agg}, {self._make_req_info_str()}"
            )

            if self._req_table_name is None:
                agg_table_names = await sc_all_agg.names_async
                if len(agg_table_names) > 1:
                    raise MultipleDataMatchesError(
                        f"Multiple tables found for {self._make_req_info_str()}", Service.SUMO
                    )

            # Single POST to Sumo to trigger aggregation for all missing columns
            sc_for_agg = sc_base.filter(realization=True, aggregation=False)
            await sc_for_agg.batch_aggregate_async(columns=cols_without_agg, operation="collection", no_wait=False)
            perf_metrics.record_lap("batch-aggregate")

            # Aggregations now exist in Sumo — fetch them
            try:
                async with asyncio.TaskGroup() as tg:
                    fetch_agg_tasks = {
                        col: tg.create_task(self._fetch_newly_aggregated_column_async(col, sc_base))
                        for col in cols_without_agg
                    }
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group

            for col, task in fetch_agg_tasks.items():
                results[col] = task.result()

            perf_metrics.record_lap("fetch-after-batch-agg")

        LOGGER.debug(
            f"ArrowTableLoader.get_aggregated_columns_batched_async() took: {perf_metrics.to_string()}, "
            f"columns={column_names}, {self._make_req_info_str()}"
        )

        return results

    async def _fetch_expected_aggregations_async(
        self,
        column_names: list[str],
        sc_base: SearchContext,
        perf_metrics: PerfMetrics,
    ) -> dict[str, pa.Table]:
        """Fetch columns that are expected to already be aggregated (post-LRO).

        Skips the discovery and staleness-validation steps.  Instead, attempts to
        fetch all columns in parallel and retries any that are not yet visible in
        the Sumo/ES index.  This handles the eventual-consistency delay that can
        be significant when many columns are aggregated at once (observed 10-30s+
        for ~200 columns).
        """
        results: dict[str, pa.Table] = {}
        remaining = list(column_names)

        # First attempt — fetch all in parallel, no sleep
        retry_delays = [1.0, 2.0, 3.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0]
        for attempt_idx in range(len(retry_delays) + 1):
            fetch_results: dict[str, pa.Table | None] = {}
            try:
                async with asyncio.TaskGroup() as tg:
                    fetch_tasks = {
                        col: tg.create_task(self._try_fetch_agg_async(col, sc_base)) for col in remaining
                    }
            except* ServiceLayerException as exc_group:
                for exc in exc_group.exceptions:
                    raise exc from exc_group

            for col, task in fetch_tasks.items():
                fetch_results[col] = task.result()

            still_missing: list[str] = []
            for col in remaining:
                tbl = fetch_results[col]
                if tbl is not None:
                    results[col] = tbl
                else:
                    still_missing.append(col)

            if not still_missing:
                perf_metrics.record_lap(f"fetch-expected(attempt={attempt_idx + 1})")
                break

            if attempt_idx < len(retry_delays):
                delay = retry_delays[attempt_idx]
                LOGGER.debug(
                    f"Post-LRO fetch: {len(still_missing)}/{len(column_names)} columns not yet visible "
                    f"(attempt {attempt_idx + 1}), retrying in {delay}s"
                )
                perf_metrics.record_lap(f"fetch-expected(attempt={attempt_idx + 1})")
                await asyncio.sleep(delay)
                remaining = still_missing
            else:
                perf_metrics.record_lap(f"fetch-expected(attempt={attempt_idx + 1})")

        if still_missing:
            raise NoDataError(
                f"After batch_aggregate, {len(still_missing)}/{len(column_names)} columns never became "
                f"visible in the Sumo index: {still_missing[:10]}{'...' if len(still_missing) > 10 else ''}, "
                f"{self._make_req_info_str()}",
                Service.SUMO,
            )

        return results

    async def _try_fetch_agg_async(
        self,
        column_name: str,
        sc_base: SearchContext,
    ) -> pa.Table | None:
        """Try to fetch an aggregation for a single column. Returns None if not found.

        Handles the case where length_async() reports 1 but getitem_async(0) fails
        with IndexError due to Elasticsearch eventual consistency (the count query
        and the item-fetch query may hit different index snapshots).
        """
        sc_col_agg = sc_base.filter(column=column_name, aggregation="collection", realization=False)
        agg_count = await sc_col_agg.length_async()

        if agg_count == 0:
            return None
        if agg_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple aggregations for {column_name=}, {self._make_req_info_str()}", Service.SUMO
            )

        try:
            agg_table_obj: Table = await sc_col_agg.getitem_async(0)
        except IndexError:
            # length_async saw the item but getitem_async's internal search didn't — ES consistency lag
            return None
        return await agg_table_obj.to_arrow_async()

    async def _fetch_and_validate_agg_async(
        self,
        column_name: str,
        sc_base: SearchContext,
    ) -> pa.Table | None:
        """Fetch an existing aggregation for a single column and validate it.
        Returns Arrow table if valid, None if stale/invalid.
        """
        sc_col_agg = sc_base.filter(column=column_name, aggregation="collection", realization=False)

        agg_count = await sc_col_agg.length_async()
        if agg_count > 1:
            raise MultipleDataMatchesError(
                f"Multiple aggregations for {column_name=}, {self._make_req_info_str()}", Service.SUMO
            )
        if agg_count == 0:
            return None

        agg_table_obj: Table = await sc_col_agg.getitem_async(0)

        # Concurrent: fetch blob + validate staleness (per-column realization check)
        async with asyncio.TaskGroup() as tg:
            tg.create_task(agg_table_obj.blob_async)
            validate_task = tg.create_task(
                _is_agg_valid_for_reals_async(agg_table_obj, sc_base.filter(column=column_name))
            )

        if not validate_task.result():
            LOGGER.debug(f"ArrowTableLoader: stale aggregation for {column_name=}, {self._make_req_info_str()}")
            return None

        return await agg_table_obj.to_arrow_async()

    async def _fetch_newly_aggregated_column_async(
        self,
        column_name: str,
        sc_base: SearchContext,
    ) -> pa.Table:
        """Fetch a column aggregation that was just created by batch_aggregate_async.

        Sumo uses Elasticsearch which is eventually consistent — newly created
        aggregations may not be immediately discoverable through search queries.
        This method retries with short backoff to handle that propagation delay.
        """
        retry_delays = [0.5, 1.0, 2.0, 4.0]
        for attempt in range(len(retry_delays) + 1):
            sc_col_agg = sc_base.filter(column=column_name, aggregation="collection", realization=False)
            agg_count = await sc_col_agg.length_async()

            if agg_count == 1:
                try:
                    agg_table_obj: Table = await sc_col_agg.getitem_async(0)
                except IndexError:
                    # length_async saw it but getitem_async didn't — treat as not yet visible
                    pass
                else:
                    if attempt > 0:
                        LOGGER.info(
                            f"Aggregation for {column_name=} became available after {attempt} retries, "
                            f"{self._make_req_info_str()}"
                        )
                    return await agg_table_obj.to_arrow_async()

            if agg_count > 1:
                raise MultipleDataMatchesError(
                    f"Multiple aggregations for {column_name=}, {self._make_req_info_str()}", Service.SUMO
                )

            # agg_count == 0: not yet visible in index
            if attempt < len(retry_delays):
                LOGGER.debug(
                    f"Aggregation for {column_name=} not yet visible (attempt {attempt + 1}), "
                    f"retrying in {retry_delays[attempt]}s"
                )
                await asyncio.sleep(retry_delays[attempt])

        raise NoDataError(
            f"Aggregation not found after batch_aggregate for {column_name=} "
            f"(retried {len(retry_delays)} times), {self._make_req_info_str()}",
            Service.SUMO,
        )

    # ── Single realization fetch ─────────────────────────────────────────────────

    async def get_single_realization_async(self, realization: int) -> pa.Table:
        """Get a pyarrow table for a given realization"""

        perf_metrics = PerfMetrics()

        sc_tables = SearchContext(sumo=self._sumo_client).tables.filter(
            uuid=self._case_uuid,
            ensemble=self._ensemble_name,
            realization=realization,
            name=self._req_table_name,
            content=self._req_content_types,
            tagname=self._req_tagname,
        )

        table_count = await sc_tables.length_async()
        perf_metrics.record_lap("locate")

        if table_count == 0:
            raise NoDataError(f"No tables found for: {self._make_req_info_str()}", Service.SUMO)

        if table_count > 1:
            raise MultipleDataMatchesError(f"Multiple tables found for: {self._make_req_info_str()}", Service.SUMO)

        sumo_table_obj: Table = await sc_tables.getitem_async(0)
        perf_metrics.record_lap("get-obj")

        arrow_table: pa.Table = await sumo_table_obj.to_arrow_async()
        perf_metrics.record_lap("to-arrow")

        LOGGER.debug(
            f"ArrowTableLoader.get_single_realization() took: {perf_metrics.to_string()}, {realization=}, {self._make_req_info_str()}"
        )

        return arrow_table

    # ── Helpers ───────────────────────────────────────────────────────────────────

    def _make_req_info_str(self) -> str:
        info_str = f"table_name={self._req_table_name}, content_type={self._req_content_types}"
        if self._req_tagname is not None:
            info_str += f", tagname={self._req_tagname}"
        return info_str


async def _is_agg_valid_for_reals_async(agg_sumo_table_obj: Table, sc_tables: SearchContext) -> bool:
    """
    Check if the aggregation is valid with regards to the underlying realizations.
    """
    agg_ts = agg_sumo_table_obj.metadata["_sumo"]["timestamp"]

    sc_real_tables = sc_tables.filter(realization=True, aggregation=False)
    sc_real_tables_older_than_agg = sc_real_tables.filter(complex={"range": {"_sumo.timestamp": {"lt": agg_ts}}})

    # Get the realization ids for the tables that are older than the aggregation
    real_ids_older_than_agg = await sc_real_tables_older_than_agg.realizationids_async

    # Get the current realization count
    current_real_count = await sc_real_tables.filter().length_async()

    # If there are any new realizations the aggregation is invalid
    if current_real_count != len(real_ids_older_than_agg):
        return False

    # Compare the set of realization ids that are older than the aggregation with the realization
    # ids that were actually used to construct the aggregation.
    if set(real_ids_older_than_agg) != set(agg_sumo_table_obj.metadata["fmu"]["aggregation"]["realization_ids"]):
        return False

    return True
