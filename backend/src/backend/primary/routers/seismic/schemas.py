from typing import List

from pydantic import BaseModel

from services.vds_access.response_types import VdsAxis
from src.services.utils.b64 import B64FloatArray


class SeismicFencePolyline(BaseModel):
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
    Definition of a fence of seismic data from a set of (x, y) coordinates.

    The values array is base64 encoded float array. The fence length defines the number of samples
    in length direction of fence.

    See:
    - VdsAxis: https://github.com/equinor/vds-slice/blob/ab6f39789bf3d3b59a8df14f1c4682d340dc0bf3/internal/core/core.go#L37-L55
    """

    values_base64arr: B64FloatArray
    num_length_samples: int
    num_height_samples: int
    min_height: float
    max_height: float
    # z_axis: VdsAxis
