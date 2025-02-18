from typing import List

from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray

from .._shared.schemas import BoundingBox3d


class SeismicCubeSpec(BaseModel):
    """
    Specification for a seismic cube.

    `Properties:`
    - `numCols`: The number of columns in the seismic cube.
    - `numRows`: The number of rows in the seismic cube.
    - `numLayers`: The number of layers in the seismic cube.
    - `xOrigin`: The x-coordinate of the origin of the cube [m].
    - `yOrigin`: The y-coordinate of the origin of the cube [m].
    - `zOrigin`: The z-coordinate of the origin of the cube [m].
    - `xInc`: The increment in the x-direction [m].
    - `yInc`: The increment in the y-direction [m].
    - `zInc`: The increment in the z-direction [m].
    - `yFlip`: {-1, 1} - The flip factor for the y-direction (1 if not flipped, -1 if flipped).
    - `zFlip`: {-1, 1} - The flip factor for the z-direction (1 if not flipped, -1 if flipped).
    - `rotationDeg`: The rotation angle of the cube [deg].
    """

    numCols: int
    numRows: int
    numLayers: int
    xOrigin: float
    yOrigin: float
    zOrigin: float
    xInc: float
    yInc: float
    zInc: float
    yFlip: int
    zFlip: int
    rotationDeg: float


class SeismicCubeMeta(BaseModel):
    """
    Metadata for a seismic cube.
    """

    seismicAttribute: str
    unit: str
    isoDateOrInterval: str
    isObservation: bool
    isDepth: bool
    bbox: BoundingBox3d
    spec: SeismicCubeSpec


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


class SeismicSliceData(BaseModel):
    """
    Definition of a seismic slice from a seismic cube. This could be an inline, crossline, or depth slice.
    u and v axes are the respective domain coordinate system axes, and the slice traces are the seismic data values.
    The SeismicCubeMeta specification object (not part of this schema) provides a transformation matrix for converting
    the slice data from its own coordinate system (u,v) to the global coordinate system.

    `Properties:`
    - `slice_traces_b64arr`: The slice trace array is base64 encoded 1D float array - where data is stored trace by trace.
    - `bbox_utm`: The bounding box of the slice in UTM coordinates.
    - `u_min`: The minimum value of the u-axis.
    - `u_max`: The maximum value of the u-axis.
    - `u_num_samples`: The number of samples along the u-axis.
    - `u_unit`: The unit of the u-axis.
    - `v_min`: The minimum value of the v-axis.
    - `v_max`: The maximum value of the v-axis.
    - `v_num_samples`: The number of samples along the v-axis.
    - `v_unit`: The unit of the v-axis.
    - `value_min`: The minimum value of the seismic data values.
    - `value_max`: The maximum value of the seismic data values.

    Fence traces 1D array: [trace_1_sample_1, trace_1_sample_2, ..., trace_1_sample_n, ..., trace_m_sample_1, trace_m_sample_2, ..., trace_m_sample_n]
    """

    slice_traces_b64arr: B64FloatArray
    bbox_utm: List[List[float]]
    u_min: int
    u_max: int
    u_num_samples: int
    u_unit: str
    v_min: float
    v_max: float
    v_num_samples: int
    v_unit: str
    value_min: float
    value_max: float
