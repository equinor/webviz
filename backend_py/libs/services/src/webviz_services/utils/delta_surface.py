import numpy as np
import xtgeo


class SurfaceDefinitionMismatchError(Exception):
    pass


# Absolute tolerances only: np.isclose's default rtol is ~65 m at UTM northings, which would let a whole cell shift pass.
# Note: Sumo irap_binary headers store coordinates/angles as float32 (~0.5 m ULP at UTM northings, ~2-8 um on increments,
# up to ~3e-5 deg on rotation), so 1 mm requires matching float32 origins while absorbing float noise on increments.
_COORD_ABS_TOL = 1e-3  # metres
_ANGLE_ABS_TOL = 1e-4  # degrees (~17 mm at 10 km; covers float32 ULP across [0, 360))


def _is_close(a: float, b: float, abs_tol: float) -> bool:
    return bool(np.isclose(a, b, rtol=0.0, atol=abs_tol))


def _is_angle_close(a: float, b: float, abs_tol: float) -> bool:
    diff_deg = abs((a - b + 180.0) % 360.0 - 180.0)
    return diff_deg <= abs_tol


def assert_same_surface_definition(a: xtgeo.RegularSurface, b: xtgeo.RegularSurface) -> None:
    """
    Raise SurfaceDefinitionMismatchError if the two surfaces do not share the same grid definition.

    Not using xtgeo's RegularSurface.compare_topology(): it compares floats with exact != (no tolerance or 0/360
    rotation wrap-around), compares masks by default (strict=True), omits yflip, and only returns a bool rather than
    naming the mismatching fields for the user-facing message.
    """
    mismatching_fields: list[str] = []

    if a.ncol != b.ncol:
        mismatching_fields.append(f"ncol ({a.ncol} vs {b.ncol})")
    if a.nrow != b.nrow:
        mismatching_fields.append(f"nrow ({a.nrow} vs {b.nrow})")
    if not _is_close(a.xinc, b.xinc, _COORD_ABS_TOL):
        mismatching_fields.append(f"xinc ({a.xinc} vs {b.xinc})")
    if not _is_close(a.yinc, b.yinc, _COORD_ABS_TOL):
        mismatching_fields.append(f"yinc ({a.yinc} vs {b.yinc})")
    if not _is_close(a.xori, b.xori, _COORD_ABS_TOL):
        mismatching_fields.append(f"xori ({a.xori} vs {b.xori})")
    if not _is_close(a.yori, b.yori, _COORD_ABS_TOL):
        mismatching_fields.append(f"yori ({a.yori} vs {b.yori})")
    if not _is_angle_close(a.rotation, b.rotation, _ANGLE_ABS_TOL):
        mismatching_fields.append(f"rotation ({a.rotation} vs {b.rotation})")
    if a.yflip != b.yflip:
        mismatching_fields.append(f"yflip ({a.yflip} vs {b.yflip})")

    if mismatching_fields:
        raise SurfaceDefinitionMismatchError(
            f"Surfaces have different definitions, mismatching fields: {', '.join(mismatching_fields)}"
        )


def subtract_surfaces(minuend: xtgeo.RegularSurface, subtrahend: xtgeo.RegularSurface) -> xtgeo.RegularSurface:
    """
    Returns minuend - subtrahend as a new surface. Cells undefined in either input are undefined in the result.
    """
    assert_same_surface_definition(minuend, subtrahend)

    result = minuend.copy()
    result.values = minuend.values - subtrahend.values

    return result


def is_entirely_undefined(surf: xtgeo.RegularSurface) -> bool:
    """
    True when every cell is masked, e.g. because the inputs had disjoint defined regions.
    """
    return bool(np.ma.getmaskarray(surf.values).all())


def compute_delta_surface(
    comparison_monitor: xtgeo.RegularSurface,
    comparison_base: xtgeo.RegularSurface | None,
    reference_monitor: xtgeo.RegularSurface | None,
    reference_base: xtgeo.RegularSurface | None,
) -> xtgeo.RegularSurface:
    """
    Computes (comparison_monitor - comparison_base) - (reference_monitor - reference_base) for a single realization.
    Terms that are None are omitted. reference_base may only be given together with reference_monitor and comparison_base.
    """
    if reference_base is not None and (reference_monitor is None or comparison_base is None):
        raise ValueError("reference_base requires both reference_monitor and comparison_base")
    if comparison_base is None and reference_monitor is None:
        raise ValueError("At least one of comparison_base and reference_monitor must be given")

    comparison_term = comparison_monitor
    if comparison_base is not None:
        comparison_term = subtract_surfaces(comparison_monitor, comparison_base)

    if reference_monitor is None:
        return comparison_term

    reference_term = reference_monitor
    if reference_base is not None:
        reference_term = subtract_surfaces(reference_monitor, reference_base)

    return subtract_surfaces(comparison_term, reference_term)
