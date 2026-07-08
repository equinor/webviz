"""Pure (testable) logic for the Initial Hydrostatic Equilibrium QC check.

This module deliberately contains no I/O code so the numerical and decision logic can be unit
tested in isolation. Data fetching/orchestration lives in HydrostaticEquilibriumCheck.
"""

from datetime import datetime
from typing import List, Sequence

import numpy as np
from numpy.typing import NDArray

from . import hydrostatic_equilibrium_types as types

# A value is treated as effectively zero if its magnitude is below this. Cumulative production /
# injection vectors are reported in large units, so an absolute tolerance is appropriate here.
ZERO_VECTOR_TOLERANCE = 1e-6

# Minimum gap between t0 and t1 for t1 to be considered "sufficiently far" from start of simulation.
MIN_TIME_GAP_DAYS = 100.0

# Cumulative production / injection vectors that must all be zero between t0 and t1.
HYDROSTATIC_CUMULATIVE_VECTORS = ["FOPT", "FGPT", "FWPT", "FGIT", "FWIT"]

# Dynamic 3D grid properties that must be unchanged between t0 and t1.
HYDROSTATIC_GRID_PROPERTIES = ["PRESSURE", "SWAT", "SGAS", "SOIL"]

# Saturations are dimensionless and bounded to the [0, 1] range. Because they legitimately pass
# through (and sit at) zero, a per-cell relative change is unstable - dividing a tiny change by a
# near-zero initial saturation explodes the ratio. These properties are therefore judged on their
# absolute change, which for a [0, 1] quantity already is the change relative to its full scale.
SATURATION_GRID_PROPERTIES = ["SWAT", "SGAS", "SOIL"]


def make_time_step_pair(t0_iso: str, t1_iso: str) -> types.TimeStepPair:
    """Build a TimeStepPair, computing the gap in days and whether it is sufficiently large."""

    t0 = datetime.fromisoformat(t0_iso)
    t1 = datetime.fromisoformat(t1_iso)
    time_gap_days = (t1 - t0).total_seconds() / 86400.0
    return types.TimeStepPair(
        t0_iso=t0_iso,
        t1_iso=t1_iso,
        time_gap_days=time_gap_days,
        time_gap_ok=time_gap_days > MIN_TIME_GAP_DAYS,
    )


def resolve_initial_time_steps(available_iso_timestamps: Sequence[str]) -> types.TimeStepPair:
    """Pick the first two distinct, chronologically sorted time steps as t0 and t1.

    Raises ValueError if fewer than two distinct time steps are available.
    """

    unique_sorted = sorted(set(available_iso_timestamps))
    if len(unique_sorted) < 2:
        raise ValueError("At least two distinct grid property time steps are required for the equilibrium check")

    return make_time_step_pair(unique_sorted[0], unique_sorted[1])


def evaluate_vector_value(vector_name: str, value_at_t1: float | None) -> types.VectorCheckValue:
    """Decide whether a single cumulative vector value qualifies as zero at t1."""

    is_zero = value_at_t1 is not None and abs(value_at_t1) <= ZERO_VECTOR_TOLERANCE
    return types.VectorCheckValue(vector_name=vector_name, value_at_t1=value_at_t1, is_zero=is_zero)


def compute_grid_property_change(
    property_name: str,
    values_t0: NDArray[np.floating],
    values_t1: NDArray[np.floating],
) -> types.GridPropertyCheckValue:
    """Compute the largest absolute and relative change of a property between t0 and t1.

    The two arrays are assumed to share grid geometry (identical ordering and length).

    Saturations (SWAT/SGAS/SOIL) are bounded to [0, 1] and frequently sit at zero, so a per-cell
    relative change is unstable near zero. For these the reported relative change is taken relative
    to the full [0, 1] scale (i.e. it equals the absolute change). All other properties (e.g.
    PRESSURE) use the per-cell relative change against their own t0 magnitude.

    Only the raw change metrics are returned; the pass/fail verdict against a threshold is derived
    by the client so the (expensive) computation does not need to rerun when the threshold changes.
    """

    if values_t0.shape != values_t1.shape:
        raise ValueError(f"Mismatched cell counts for property '{property_name}' between t0 and t1")

    abs_change = np.abs(values_t1 - values_t0)
    max_abs_change = float(np.max(abs_change)) if abs_change.size > 0 else 0.0

    if property_name in SATURATION_GRID_PROPERTIES:
        # The saturation scale is 1 (full [0, 1] range), so the relative change is the absolute change.
        rel_change = abs_change
    else:
        denom = np.maximum(np.abs(values_t0), ZERO_VECTOR_TOLERANCE)
        rel_change = abs_change / denom
    max_rel_change = float(np.max(rel_change)) if rel_change.size > 0 else 0.0

    return types.GridPropertyCheckValue(
        property_name=property_name,
        max_abs_change=max_abs_change,
        max_rel_change=max_rel_change,
    )


def select_available_property_names(candidate_names: Sequence[str], available_names: Sequence[str]) -> List[str]:
    """Return the candidate property names that actually exist in the ensemble, preserving order."""

    available_set = set(available_names)
    return [name for name in candidate_names if name in available_set]
