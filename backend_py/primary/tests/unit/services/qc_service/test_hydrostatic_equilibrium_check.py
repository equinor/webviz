# pylint: disable=async-suffix, unused-argument
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Sequence, cast

import numpy as np
import pytest

from webviz_services.qc_service.hydrostatic_equilibrium.hydrostatic_equilibrium_check import (
    HydrostaticEquilibriumCheck,
)
from webviz_services.service_exceptions import NoDataError
from webviz_services.sumo_access.generic_types import EnsembleScalarResponse
from webviz_services.sumo_access.grid3d_access import (
    Grid3dAccess,
    Grid3dBoundingBox,
    Grid3dDimensions,
    Grid3dInfo,
    Grid3dPropertyInfo,
    Grid3dPropertyValues,
)
from webviz_services.sumo_access.summary_access import SummaryAccess

T0_ISO = "2020-01-01"
T1_ISO = "2020-07-01"


def _utc_ms(year: int, month: int, day: int) -> int:
    return int(datetime(year, month, day, tzinfo=timezone.utc).timestamp() * 1000)


T0_MS = _utc_ms(2020, 1, 1)
T1_MS = _utc_ms(2020, 7, 1)


class _FakeSummaryAccess:
    def __init__(self, vector_names: list[str], values_at_t1: dict[str, dict[int, float]]) -> None:
        self._vector_names = vector_names
        self._values_at_t1 = values_at_t1

    async def get_available_vectors_async(self) -> list[SimpleNamespace]:
        return [SimpleNamespace(name=name) for name in self._vector_names]

    async def get_timestamps_async(self) -> list[int]:
        return [T0_MS, T1_MS]

    async def get_vector_values_at_timestamp_async(
        self, vector_name: str, timestamp_utc_ms: int, realizations: Sequence[int] | None = None
    ) -> EnsembleScalarResponse:
        assert timestamp_utc_ms == T1_MS
        rows = self._values_at_t1.get(vector_name, {})
        selected = {real: val for real, val in rows.items() if realizations is None or real in realizations}
        return EnsembleScalarResponse(realizations=list(selected.keys()), values=list(selected.values()))


class _FakeGridAccess:
    def __init__(self, property_infos: list[Grid3dPropertyInfo]) -> None:
        self._property_infos = property_infos
        self.requested_property_names: list[str] = []

    async def get_models_info_arr_async(self, realization: int) -> list[Grid3dInfo]:
        return [
            Grid3dInfo(
                grid_name="grid",
                bbox=Grid3dBoundingBox(xmin=0, ymin=0, zmin=0, xmax=1, ymax=1, zmax=1),
                dimensions=Grid3dDimensions(i_count=1, j_count=1, k_count=3, subgrids=[]),
                property_info_arr=self._property_infos,
            )
        ]

    async def get_grid_property_values_async(
        self, *, grid_name: str, property_name: str, iso_date_str: str, realization: int
    ) -> Grid3dPropertyValues:
        self.requested_property_names.append(property_name)
        return Grid3dPropertyValues(
            values=np.array([100.0, 200.0, 300.0]),
            active_mask=np.ones(3, dtype=bool),
            source_object_uuid=f"{property_name}-{iso_date_str}",
        )


def _make_check(
    summary_access: _FakeSummaryAccess | None = None, grid_access: _FakeGridAccess | None = None
) -> HydrostaticEquilibriumCheck:
    return HydrostaticEquilibriumCheck(
        ensemble_name="iter-0",
        grid3d_access=cast(Grid3dAccess, grid_access or _FakeGridAccess([])),
        summary_access=cast(SummaryAccess, summary_access) if summary_access else None,
    )


async def test_vector_check_reports_realization_missing_at_t1() -> None:
    summary_access = _FakeSummaryAccess(
        vector_names=["FOPT", "FGPT"],
        values_at_t1={"FOPT": {0: 0.0, 1: 0.0}, "FGPT": {0: 0.0, 1: 0.0, 2: 0.0}},
    )
    result = await _make_check(summary_access).compute_vector_check_async(T0_ISO, T1_ISO)

    assert result.checked_vector_names == ["FOPT", "FGPT"]
    assert [r.realization for r in result.realization_results] == [0, 1, 2]
    for realization_result in result.realization_results:
        assert len(realization_result.vector_values) == len(result.checked_vector_names)

    fopt_real2 = result.realization_results[2].vector_values[0]
    assert fopt_real2.vector_name == "FOPT"
    assert fopt_real2.value_at_t1 is None
    assert fopt_real2.is_zero is False
    assert result.realization_results[2].vector_values[1].is_zero is True


async def test_vector_check_explicit_realizations_includes_realization_without_data() -> None:
    summary_access = _FakeSummaryAccess(
        vector_names=["FOPT", "FGPT"],
        values_at_t1={"FOPT": {0: 0.0, 1: 5.0}, "FGPT": {0: 0.0, 1: 0.0}},
    )
    result = await _make_check(summary_access).compute_vector_check_async(T0_ISO, T1_ISO, realizations=[0, 1, 2])

    assert [r.realization for r in result.realization_results] == [0, 1, 2]
    real1, real2 = result.realization_results[1], result.realization_results[2]
    assert real1.vector_values[0].is_zero is False
    assert [v.value_at_t1 for v in real2.vector_values] == [None, None]
    assert [v.is_zero for v in real2.vector_values] == [False, False]


async def test_grid_check_only_uses_properties_available_at_both_time_steps() -> None:
    grid_access = _FakeGridAccess(
        [
            Grid3dPropertyInfo(property_name="PRESSURE", iso_date_or_interval=T0_ISO),
            Grid3dPropertyInfo(property_name="PRESSURE", iso_date_or_interval=T1_ISO),
            Grid3dPropertyInfo(property_name="SWAT", iso_date_or_interval=None),
            Grid3dPropertyInfo(property_name="SGAS", iso_date_or_interval=T0_ISO),
        ]
    )
    result = await _make_check(grid_access=grid_access).compute_grid_property_check_async("grid", 0)

    assert result.checked_property_names == ["PRESSURE"]
    assert set(grid_access.requested_property_names) == {"PRESSURE"}
    assert [v.property_name for v in result.realization_result.property_values] == ["PRESSURE"]


async def test_grid_check_raises_when_no_property_at_both_time_steps() -> None:
    grid_access = _FakeGridAccess(
        [
            Grid3dPropertyInfo(property_name="PRESSURE", iso_date_or_interval=T0_ISO),
            Grid3dPropertyInfo(property_name="SWAT", iso_date_or_interval=T1_ISO),
        ]
    )
    with pytest.raises(NoDataError):
        await _make_check(grid_access=grid_access).compute_grid_property_check_async("grid", 0)
    assert not grid_access.requested_property_names
