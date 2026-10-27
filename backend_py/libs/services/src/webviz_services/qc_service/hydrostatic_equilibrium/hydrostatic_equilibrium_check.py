"""Service-layer orchestration for the Initial Hydrostatic Equilibrium QC check.

HydrostaticEquilibriumCheck assembles the check results from the various Sumo access / user-session
services. It owns all the business logic for this check; the primary API routers only translate the
resulting domain objects into API schemas.

Each QC check is its own self-contained unit (own types, logic and orchestration). Checks only ever
return raw values/metrics; deriving a pass/fail verdict from them is left entirely to the client.
"""

import asyncio
import logging
from typing import List, NamedTuple

from webviz_core_utils.timestamp_utils import iso_str_to_date_str, timestamp_utc_ms_to_iso_str

from webviz_services.service_exceptions import InvalidParameterError, NoDataError, Service
from webviz_services.sumo_access.grid3d_access import Grid3dAccess, Grid3dInfo
from webviz_services.sumo_access.summary_access import SummaryAccess

from . import equilibrium_logic as logic
from . import hydrostatic_equilibrium_types as types

LOGGER = logging.getLogger(__name__)


class _GridPropertyEvaluation(NamedTuple):
    """Result of evaluating a single grid property between t0 and t1 for one realization."""

    property_value: types.GridPropertyCheckValue
    # Sumo object uuids of the t0 and t1 property blobs the value was computed from.
    source_object_uuids: List[str]


class _GridPropertiesEvaluation(NamedTuple):
    """Result of evaluating all checked grid properties for one realization."""

    property_values: List[types.GridPropertyCheckValue]
    # De-duplicated union of all the individual properties' source object uuids.
    source_object_uuids: List[str]


class HydrostaticEquilibriumCheck:
    """Computes the Initial Hydrostatic Equilibrium QC check for a single ensemble.

    The data-access dependencies are injected so the check stays testable. The vector aspect needs
    summary access, so it is optional and validated when that aspect is run. The grid aspect reads
    the 3D grid properties directly via the (always required) grid3d access.
    """

    def __init__(
        self,
        *,
        ensemble_name: str,
        grid3d_access: Grid3dAccess,
        summary_access: SummaryAccess | None = None,
    ) -> None:
        self._ensemble_name = ensemble_name
        self._grid3d_access = grid3d_access
        self._summary_access = summary_access

    async def compute_vector_check_async(self, t0_iso: str, t1_iso: str) -> types.HydrostaticVectorCheckResult:
        """Check that there is no production/injection between t0 and t1, for all realizations.

        `t0_iso`/`t1_iso` are the already-resolved grid time steps. The grid geometry/time steps are
        shared across realizations, so the caller resolves them once (e.g. from any realization's grid
        model info) and passes them in here - this check never needs a realization or grid access of
        its own, and always evaluates every realization in the ensemble.
        """

        summary_access = self._require_summary_access()

        time_steps = logic.make_time_step_pair(t0_iso, t1_iso)

        available_vectors = await summary_access.get_available_vectors_async()
        available_vector_names = [vi.name for vi in available_vectors]
        checked_vector_names = logic.select_available_property_names(
            logic.HYDROSTATIC_CUMULATIVE_VECTORS, available_vector_names
        )

        t1_timestamp_utc_ms = await self._find_summary_timestamp_for_iso_async(time_steps.t1_iso)

        realization_results = await self._build_vector_realization_results_async(
            checked_vector_names=checked_vector_names,
            t1_timestamp_utc_ms=t1_timestamp_utc_ms,
        )

        return types.HydrostaticVectorCheckResult(
            time_steps=time_steps,
            checked_vector_names=checked_vector_names,
            realization_results=realization_results,
        )

    async def compute_grid_property_check_async(
        self, grid_name: str, realization: int
    ) -> types.HydrostaticGridCheckRealizationResult:
        """Check that dynamic 3D grid properties are unchanged between t0 and t1, for one realization.

        Computed one realization at a time so it can eventually be farmed out to a worker queue per
        realization for large ensembles; the caller issues one request per realization and aggregates
        the results as they arrive. Only the raw change metrics are returned; the threshold verdict is
        derived by the client.
        """

        grid_info = await self._get_grid_info_async(grid_name, realization)
        time_steps = self._resolve_time_steps_for_grid(grid_info)

        available_property_names = [p.property_name for p in grid_info.property_info_arr]
        checked_property_names = logic.select_available_property_names(
            logic.HYDROSTATIC_GRID_PROPERTIES, available_property_names
        )

        grid_properties_evaluation = await self._evaluate_grid_properties_for_realization_async(
            grid_name=grid_name,
            realization=realization,
            checked_property_names=checked_property_names,
            time_steps=time_steps,
        )

        return types.HydrostaticGridCheckRealizationResult(
            time_steps=time_steps,
            grid_name=grid_name,
            checked_property_names=checked_property_names,
            realization_result=types.RealizationGridCheckResult(
                realization=realization,
                property_values=grid_properties_evaluation.property_values,
                source_object_uuids=grid_properties_evaluation.source_object_uuids,
            ),
        )

    def _require_summary_access(self) -> SummaryAccess:
        if self._summary_access is None:
            raise InvalidParameterError("Summary access is required for the vector check", Service.GENERAL)
        return self._summary_access

    async def _get_grid_info_async(self, grid_name: str, realization: int) -> Grid3dInfo:
        models_info = await self._grid3d_access.get_models_info_arr_async(realization)
        grid_info = next((info for info in models_info if info.grid_name == grid_name), None)
        if grid_info is None:
            raise NoDataError(
                f"Grid model '{grid_name}' not found for realization {realization}", Service.SUMO
            )
        return grid_info

    @staticmethod
    def _resolve_time_steps_for_grid(grid_info: Grid3dInfo) -> types.TimeStepPair:
        # Collect the distinct timestamp values available for the dynamic hydrostatic grid properties.
        # Intervals (which contain a '/') are not relevant for this check and are ignored.
        timestamp_iso_set: set[str] = set()
        for prop in grid_info.property_info_arr:
            if prop.property_name not in logic.HYDROSTATIC_GRID_PROPERTIES:
                continue
            if prop.iso_date_or_interval is None or "/" in prop.iso_date_or_interval:
                continue
            timestamp_iso_set.add(prop.iso_date_or_interval)

        try:
            return logic.resolve_initial_time_steps(list(timestamp_iso_set))
        except ValueError as exc:
            raise InvalidParameterError(str(exc), Service.SUMO) from exc

    async def _find_summary_timestamp_for_iso_async(self, target_iso: str) -> int:
        summary_access = self._require_summary_access()
        target_date = iso_str_to_date_str(target_iso)
        summary_timestamps = await summary_access.get_timestamps_async()
        for timestamp_utc_ms in summary_timestamps:
            if iso_str_to_date_str(timestamp_utc_ms_to_iso_str(timestamp_utc_ms)) == target_date:
                return timestamp_utc_ms
        raise NoDataError(f"No summary data found for time step '{target_iso}'", Service.SUMO)

    async def _build_vector_realization_results_async(
        self,
        *,
        checked_vector_names: List[str],
        t1_timestamp_utc_ms: int,
    ) -> List[types.RealizationVectorCheckResult]:
        summary_access = self._require_summary_access()

        # Fetch each checked vector's value-at-t1 (for all realizations) concurrently rather than
        # one at a time, since each fetch is an independent, potentially high-latency Sumo access.
        scalar_resps = await asyncio.gather(
            *(
                summary_access.get_vector_values_at_timestamp_async(
                    vector_name=vector_name, timestamp_utc_ms=t1_timestamp_utc_ms, realizations=None
                )
                for vector_name in checked_vector_names
            )
        )

        # Gather, per realization, the value of each checked cumulative vector at t1.
        realization_to_values: dict[int, List[types.VectorCheckValue]] = {}
        for vector_name, scalar_resp in zip(checked_vector_names, scalar_resps):
            for realization, value in zip(scalar_resp.realizations, scalar_resp.values):
                realization_to_values.setdefault(realization, []).append(
                    logic.evaluate_vector_value(vector_name, value)
                )

        realization_results: List[types.RealizationVectorCheckResult] = []
        for realization in sorted(realization_to_values.keys()):
            vector_values = realization_to_values[realization]
            realization_results.append(
                types.RealizationVectorCheckResult(
                    realization=realization,
                    vector_values=vector_values,
                )
            )
        return realization_results

    async def _evaluate_grid_properties_for_realization_async(
        self,
        *,
        grid_name: str,
        realization: int,
        checked_property_names: List[str],
        time_steps: types.TimeStepPair,
    ) -> _GridPropertiesEvaluation:
        evaluations = await asyncio.gather(
            *(
                self._evaluate_single_grid_property_async(
                    grid_name=grid_name,
                    realization=realization,
                    property_name=property_name,
                    time_steps=time_steps,
                )
                for property_name in checked_property_names
            )
        )
        property_values = [evaluation.property_value for evaluation in evaluations]
        # Collect the source object uuids across all checked properties, de-duplicated while
        # preserving order, so the caller (and any future cache-write-back) can see the full set of
        # Sumo objects the realization's result was derived from.
        source_object_uuids = list(
            dict.fromkeys(uuid for evaluation in evaluations for uuid in evaluation.source_object_uuids)
        )
        return _GridPropertiesEvaluation(property_values=property_values, source_object_uuids=source_object_uuids)

    async def _evaluate_single_grid_property_async(
        self,
        *,
        grid_name: str,
        realization: int,
        property_name: str,
        time_steps: types.TimeStepPair,
    ) -> _GridPropertyEvaluation:
        # Download the t0 and t1 property arrays concurrently, reading the roff blobs directly with xtgeo.
        result_t0, result_t1 = await asyncio.gather(
            self._grid3d_access.get_grid_property_values_async(
                grid_name=grid_name,
                property_name=property_name,
                iso_date_str=time_steps.t0_iso,
                realization=realization,
            ),
            self._grid3d_access.get_grid_property_values_async(
                grid_name=grid_name,
                property_name=property_name,
                iso_date_str=time_steps.t1_iso,
                realization=realization,
            ),
        )
        property_value = logic.compute_grid_property_change(property_name, result_t0.values, result_t1.values)
        return _GridPropertyEvaluation(
            property_value=property_value,
            source_object_uuids=[result_t0.source_object_uuid, result_t1.source_object_uuid],
        )
