from typing import List

from pydantic import BaseModel

from src.services.utils.b64 import B64FloatArray


class SeismicFencePolyline(BaseModel):
    """
    (x, y) points defining a polyline in domain coordinate system, to retrieve fence of seismic data.

    Expect equal number of x- and y-points.

    Note: Coordinates are in domain coordinate system (UTM).

    NOTE:
    - Verify coordinates are in domain coordinate system (UTM)?
    - Consider points_xy array with [x1, y1, x2, y2, ..., xn, yn] instead of x_points and y_points arrays?
    - Ensure equal length of x_points and y_points arrays?
    """

    x_points: List[float]
    y_points: List[float]
    # points_xy: List[float]


class SeismicCubeMeta(BaseModel):
    seismic_attribute: str
    iso_date_or_interval: str
    is_observation: bool
    is_depth: bool


class SeismicFenceData(BaseModel):
    """
    Definition of a fence of seismic data from a set of (x, y) coordinates in domain coordinate system.

    - fence_traces_encoded: The fence trace array is base64 encoded float array.
    - num_traces: The number of traces along length/width direction of the fence, i.e. the number of (x, y) coordinates.
    - num_trace_samples: The number of samples in each trace, i.e. the number of values along the height/depth axis of the fence.
    - min_height: The minimum height/depth value of the fence.
    - max_height: The maximum height/depth value of the fence.

    Each (x, y) point provides a trace perpendicular to the x-y plane, with number of samples equal to the depth of the seismic cube.

    trace1  trace2  trace3
    |-------|-------|
    |-------|-------|
    |-------|-------|  Height/depth axis
    |-------|-------|
    |-------|-------|

    See:
    - VdsAxis: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
    """

    fence_traces_encoded: B64FloatArray  # Encoded flattened array of fence values
    # num_length_samples:int
    # num_height_samples: int
    num_traces: int
    num_trace_samples: int
    min_height: float
    max_height: float
