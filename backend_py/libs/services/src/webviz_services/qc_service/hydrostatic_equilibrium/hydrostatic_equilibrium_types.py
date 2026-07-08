"""Service-layer domain types for the Initial Hydrostatic Equilibrium QC check.

These types are independent of the primary API schemas so the API contract can evolve separately
from the internal service representation.
"""

from typing import List, Optional

from pydantic import BaseModel


class TimeStepPair(BaseModel):
    """The two time steps (t0 and t1) used for an initial-equilibrium check."""

    t0_iso: str
    t1_iso: str
    time_gap_days: float
    # True if t1 - t0 is large enough to be considered "sufficiently far" from start of simulation.
    time_gap_ok: bool


class VectorCheckValue(BaseModel):
    """Cumulative production/injection vector value evaluated at t1."""

    vector_name: str
    # Value at t1. May be None if the vector is not present in the ensemble.
    value_at_t1: Optional[float] = None
    is_zero: bool


class RealizationVectorCheckResult(BaseModel):
    """Per-realization result of the vector part of the hydrostatic-equilibrium check."""

    realization: int
    vector_values: List[VectorCheckValue]


class HydrostaticVectorCheckResult(BaseModel):
    """Ensemble-wide result of the vector part of the hydrostatic-equilibrium check."""

    time_steps: TimeStepPair
    # Names of the cumulative vectors that were required to be zero.
    checked_vector_names: List[str]
    realization_results: List[RealizationVectorCheckResult]


class GridPropertyCheckValue(BaseModel):
    """Change of a single 3D grid property between t0 and t1 for one realization."""

    property_name: str
    # Largest absolute change between t0 and t1 across all cells.
    max_abs_change: float
    # Largest relative change between t0 and t1 across all cells. The pass/fail verdict against a
    # threshold is derived by the client, so no threshold is applied here.
    max_rel_change: float


class RealizationGridCheckResult(BaseModel):
    """Per-realization result of the 3D grid property part of the hydrostatic-equilibrium check."""

    realization: int
    property_values: List[GridPropertyCheckValue]
    # Sumo object uuids of the property blobs (t0 and t1, for every checked property) that the
    # result was computed from. Needed so a cached/derived result can eventually be written back to
    # Sumo identified by (partly) the source objects it was derived from. Service-internal only -
    # intentionally not part of the API schema, so it is not sent to the client.
    source_object_uuids: List[str]


class HydrostaticGridCheckRealizationResult(BaseModel):
    """Result of the 3D grid property part of the hydrostatic-equilibrium check for one realization.

    Computed one realization at a time so it can eventually be farmed out to a worker queue per
    realization for large ensembles; the caller issues one request per realization and aggregates the
    results as they arrive.
    """

    time_steps: TimeStepPair
    grid_name: str
    # Names of the dynamic 3D properties that were compared between t0 and t1.
    checked_property_names: List[str]
    realization_result: RealizationGridCheckResult
