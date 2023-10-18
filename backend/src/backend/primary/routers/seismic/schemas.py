from typing import List

from pydantic import BaseModel

from services.vds_access.response_types import VdsAxis
from src.services.utils.b64 import B64FloatArray


class SeismicFencePolyline(BaseModel):
    """
    x- and y-coordinates of a polyline defining a fence of seismic data.

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

    The values array is base64 encoded float array. The number of traces is the number of traces along length direction
    of the fence, and the number of trace samples is the number of samples along the height/depth axis of the fence.

    The fence is defined as follows:

        trace1  trace2   trace3
           |-------|-------|
           |-------|-------|
    Height |-------|-------|
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
