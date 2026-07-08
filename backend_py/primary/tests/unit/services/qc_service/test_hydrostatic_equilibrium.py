import numpy as np
import pytest

from webviz_services.qc_service.hydrostatic_equilibrium import equilibrium_logic as he


def test_resolve_initial_time_steps_picks_first_two_sorted() -> None:
    time_steps = he.resolve_initial_time_steps(["2020-07-01", "2020-01-01", "2021-01-01"])
    assert time_steps.t0_iso == "2020-01-01"
    assert time_steps.t1_iso == "2020-07-01"


def test_resolve_initial_time_steps_requires_two_distinct() -> None:
    with pytest.raises(ValueError):
        he.resolve_initial_time_steps(["2020-01-01", "2020-01-01"])


def test_make_time_step_pair_gap_ok_above_threshold() -> None:
    time_steps = he.make_time_step_pair("2020-01-01", "2020-07-01")
    assert time_steps.time_gap_days > he.MIN_TIME_GAP_DAYS
    assert time_steps.time_gap_ok is True


def test_make_time_step_pair_gap_not_ok_below_threshold() -> None:
    time_steps = he.make_time_step_pair("2020-01-01", "2020-02-01")
    assert time_steps.time_gap_days <= he.MIN_TIME_GAP_DAYS
    assert time_steps.time_gap_ok is False


def test_evaluate_vector_value_zero_within_tolerance() -> None:
    value = he.evaluate_vector_value("FOPT", 0.0)
    assert value.is_zero is True


def test_evaluate_vector_value_nonzero() -> None:
    value = he.evaluate_vector_value("FOPT", 123.0)
    assert value.is_zero is False


def test_evaluate_vector_value_missing() -> None:
    value = he.evaluate_vector_value("FOPT", None)
    assert value.is_zero is False
    assert value.value_at_t1 is None


def test_compute_grid_property_change_within_threshold() -> None:
    values_t0 = np.array([100.0, 200.0, 300.0])
    values_t1 = np.array([100.0, 200.0, 300.0])
    result = he.compute_grid_property_change("PRESSURE", values_t0, values_t1)
    assert result.max_abs_change == 0.0
    assert result.max_rel_change == 0.0


def test_compute_grid_property_change_exceeds_threshold() -> None:
    values_t0 = np.array([100.0, 200.0, 300.0])
    values_t1 = np.array([100.0, 260.0, 300.0])
    result = he.compute_grid_property_change("PRESSURE", values_t0, values_t1)
    assert result.max_abs_change == pytest.approx(60.0)
    assert result.max_rel_change == pytest.approx(0.3)


def test_compute_grid_property_change_mismatched_shapes() -> None:
    with pytest.raises(ValueError):
        he.compute_grid_property_change("PRESSURE", np.array([1.0, 2.0]), np.array([1.0]))


def test_compute_grid_property_change_saturation_uses_absolute_change() -> None:
    # A near-zero initial saturation must not blow up the relative change (no division by ~0).
    values_t0 = np.array([0.0, 1e-7, 0.5])
    values_t1 = np.array([9.382e-5, 1.431e-6, 0.5])
    result = he.compute_grid_property_change("SGAS", values_t0, values_t1)
    assert result.max_abs_change == pytest.approx(9.382e-5)
    # For saturations the relative change equals the absolute change (scale is the [0, 1] range).
    assert result.max_rel_change == pytest.approx(9.382e-5)


def test_compute_grid_property_change_saturation_real_change_fails() -> None:
    values_t0 = np.array([0.0, 0.2])
    values_t1 = np.array([0.72, 0.2])
    result = he.compute_grid_property_change("SOIL", values_t0, values_t1)
    assert result.max_abs_change == pytest.approx(0.72)
    assert result.max_rel_change == pytest.approx(0.72)


def test_select_available_property_names_preserves_candidate_order() -> None:
    selected = he.select_available_property_names(["PRESSURE", "SWAT", "SGAS"], ["SGAS", "PRESSURE"])
    assert selected == ["PRESSURE", "SGAS"]
