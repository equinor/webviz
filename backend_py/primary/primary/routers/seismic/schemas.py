from typing import List

from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    iso_date_or_interval: str
    is_observation: bool
    is_depth: bool


class SeismicFencePolyline(BaseModel):
    """
    (x, y) points defining a polyline in domain coordinate system, to retrieve fence of seismic data.

    Expect equal number of x- and y-points.

    Note: Coordinates are in domain coordinate system (UTM).

    NOTE:
    - Verify coordinates are in domain coordinate system (UTM)?
    - Consider points_xy: List[float] - i.e. array with [x1, y1, x2, y2, ..., xn, yn] instead of x_points and y_points arrays?
    - Ensure equal length of x_points and y_points arrays?
    """

    x_points: List[float]
    y_points: List[float]


class SeismicFenceData(BaseModel):
    """
    Definition of a fence of seismic data from a set of (x, y) coordinates in domain coordinate system.
    Each (x, y) point provides a trace perpendicular to the x-y plane, with number of samples equal to the depth of the seismic cube.

    Each trace is defined to be a set of depth value samples along the length direction of the fence.

    `Properties:`
    - `fence_traces_b64arr`: The fence trace array is base64 encoded 1D float array - where data is stored trace by trace.
    - `num_traces`: The number of traces in the fence trace array. Equals the number of (x, y) coordinates in requested polyline.
    - `num_samples_per_trace`: The number of samples in each trace.
    - `min_fence_depth`: The minimum depth value of the fence.
    - `max_fence_depth`: The maximum depth value of the fence.

    `Description - fence_traces_b64arr:`\n
    The encoded fence trace array is a flattened array of traces, where data is stored trace by trace.
    With `m = num_traces`, and `n = num_samples_per_trace`, the flattened array has length `mxn`.

    Fence traces 1D array: [trace_1_sample_1, trace_1_sample_2, ..., trace_1_sample_n, ..., trace_m_sample_1, trace_m_sample_2, ..., trace_m_sample_n] \n

    See:
    - VdsAxis: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
    """

    fence_traces_b64arr: B64FloatArray
    num_traces: int
    num_samples_per_trace: int
    min_fence_depth: float
    max_fence_depth: float
