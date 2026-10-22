import numpy as np
import pytest
import xtgeo

from webviz_services.utils.delta_surface import (
    SurfaceDefinitionMismatchError,
    assert_same_surface_definition,
    compute_delta_surface,
    is_entirely_undefined,
    subtract_surfaces,
)


def create_surface(
    values: list[list[float]], masked_cells: list[tuple[int, int]] | None = None, **kwargs: float
) -> xtgeo.RegularSurface:
    """Helper to create a 3x2 surface, optionally with masked cells."""
    mask = np.zeros((3, 2), dtype=bool)
    for col, row in masked_cells or []:
        mask[col, row] = True

    surf_args = {"ncol": 3, "nrow": 2, "xinc": 10.0, "yinc": 10.0, "xori": 0.0, "yori": 0.0, "rotation": 0.0}
    surf_args.update(kwargs)

    return xtgeo.RegularSurface(
        ncol=int(surf_args["ncol"]),
        nrow=int(surf_args["nrow"]),
        xinc=surf_args["xinc"],
        yinc=surf_args["yinc"],
        xori=surf_args["xori"],
        yori=surf_args["yori"],
        rotation=surf_args["rotation"],
        values=np.ma.MaskedArray(np.array(values, dtype=np.float64), mask=mask),
    )


def test_time_delta_only() -> None:
    monitor = create_surface([[10, 20], [30, 40], [50, 60]])
    base = create_surface([[1, 2], [3, 4], [5, 6]])

    result = compute_delta_surface(monitor, base, None, None)

    np.testing.assert_allclose(result.values.filled(np.nan), [[9, 18], [27, 36], [45, 54]])


def test_delta_ensemble_only() -> None:
    comparison = create_surface([[10, 20], [30, 40], [50, 60]])
    reference = create_surface([[1, 2], [3, 4], [5, 6]])

    result = compute_delta_surface(comparison, None, reference, None)

    np.testing.assert_allclose(result.values.filled(np.nan), [[9, 18], [27, 36], [45, 54]])


def test_delta_ensemble_and_time_delta() -> None:
    comparison_monitor = create_surface([[100, 100], [100, 100], [100, 100]])
    comparison_base = create_surface([[40, 40], [40, 40], [40, 40]])
    reference_monitor = create_surface([[70, 70], [70, 70], [70, 70]])
    reference_base = create_surface([[50, 50], [50, 50], [50, 50]])

    result = compute_delta_surface(comparison_monitor, comparison_base, reference_monitor, reference_base)

    # (100 - 40) - (70 - 50) = 40
    np.testing.assert_allclose(result.values.filled(np.nan), np.full((3, 2), 40.0))


def test_compute_delta_does_not_modify_inputs() -> None:
    monitor = create_surface([[10, 20], [30, 40], [50, 60]])
    base = create_surface([[1, 2], [3, 4], [5, 6]])

    compute_delta_surface(monitor, base, None, None)

    np.testing.assert_allclose(monitor.values.filled(np.nan), [[10, 20], [30, 40], [50, 60]])
    np.testing.assert_allclose(base.values.filled(np.nan), [[1, 2], [3, 4], [5, 6]])


def test_mask_propagates_from_either_input() -> None:
    minuend = create_surface([[10, 20], [30, 40], [50, 60]], masked_cells=[(0, 0)])
    subtrahend = create_surface([[1, 2], [3, 4], [5, 6]], masked_cells=[(2, 1)])

    result = subtract_surfaces(minuend, subtrahend)

    expected_mask = np.array([[True, False], [False, False], [False, True]])
    np.testing.assert_array_equal(np.ma.getmaskarray(result.values), expected_mask)
    assert result.values[1, 1] == 36


def test_mask_propagates_through_four_terms() -> None:
    values = [[10, 20], [30, 40], [50, 60]]
    comparison_monitor = create_surface(values)
    comparison_base = create_surface(values)
    reference_monitor = create_surface(values, masked_cells=[(1, 0)])
    reference_base = create_surface(values)

    result = compute_delta_surface(comparison_monitor, comparison_base, reference_monitor, reference_base)

    assert np.ma.getmaskarray(result.values).sum() == 1
    assert result.values.mask[1, 0]


def test_reference_base_requires_reference_monitor_and_comparison_base() -> None:
    surf = create_surface([[1, 2], [3, 4], [5, 6]])

    with pytest.raises(ValueError):
        compute_delta_surface(surf, surf, None, surf)
    with pytest.raises(ValueError):
        compute_delta_surface(surf, None, surf, surf)


def test_compute_delta_requires_at_least_one_delta_term() -> None:
    surf = create_surface([[1, 2], [3, 4], [5, 6]])

    with pytest.raises(ValueError):
        compute_delta_surface(surf, None, None, None)


def test_assert_same_surface_definition_passes_for_equal_definitions() -> None:
    a = create_surface([[1, 2], [3, 4], [5, 6]])
    b = create_surface([[6, 5], [4, 3], [2, 1]])

    assert_same_surface_definition(a, b)


def test_assert_same_surface_definition_raises_for_differing_ncol() -> None:
    a = create_surface([[1, 2], [3, 4], [5, 6]])
    b = xtgeo.RegularSurface(
        ncol=2, nrow=2, xinc=10.0, yinc=10.0, xori=0.0, yori=0.0, values=np.ones((2, 2), dtype=np.float64)
    )

    with pytest.raises(SurfaceDefinitionMismatchError, match="ncol"):
        assert_same_surface_definition(a, b)


def test_assert_same_surface_definition_raises_for_differing_xori() -> None:
    a = create_surface([[1, 2], [3, 4], [5, 6]])
    b = create_surface([[1, 2], [3, 4], [5, 6]], xori=5.0)

    with pytest.raises(SurfaceDefinitionMismatchError, match="xori"):
        assert_same_surface_definition(a, b)


def test_assert_same_surface_definition_raises_for_whole_cell_shift_at_utm_scale() -> None:
    # With np.isclose's default relative tolerance these would compare equal (~65 m at this magnitude)
    a = create_surface([[1, 2], [3, 4], [5, 6]], xori=456_000.0, yori=6_500_000.0)
    b = create_surface([[1, 2], [3, 4], [5, 6]], xori=456_000.0, yori=6_500_010.0)

    with pytest.raises(SurfaceDefinitionMismatchError, match="yori"):
        assert_same_surface_definition(a, b)


def test_assert_same_surface_definition_tolerates_float_noise_at_utm_scale() -> None:
    a = create_surface([[1, 2], [3, 4], [5, 6]], xori=456_000.0, yori=6_500_000.0)
    b = create_surface([[1, 2], [3, 4], [5, 6]], xori=456_000.0 + 1e-6, yori=6_500_000.0 - 1e-6)

    assert_same_surface_definition(a, b)


def test_is_entirely_undefined_for_disjoint_masks() -> None:
    minuend = create_surface([[10, 20], [30, 40], [50, 60]], masked_cells=[(0, 0), (0, 1), (1, 0)])
    subtrahend = create_surface([[1, 2], [3, 4], [5, 6]], masked_cells=[(1, 1), (2, 0), (2, 1)])

    result = subtract_surfaces(minuend, subtrahend)

    assert is_entirely_undefined(result)
    assert not is_entirely_undefined(minuend)


def test_subtract_surfaces_raises_for_mismatching_definitions() -> None:
    a = create_surface([[1, 2], [3, 4], [5, 6]])
    b = create_surface([[1, 2], [3, 4], [5, 6]], rotation=30.0)

    with pytest.raises(SurfaceDefinitionMismatchError, match="rotation"):
        subtract_surfaces(a, b)
