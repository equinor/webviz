from numpy.typing import NDArray

from src.services.utils.b64 import b64_encode_float_array_as_float32
from src.services.vds_access.types import VdsAxis

from .schemas import SeismicIntersectionData


def to_api_seismic_fence_data(vds_fence_data: NDArray, z_axis: VdsAxis) -> SeismicIntersectionData:
    """
    Convert VDS fence data to API fence data
    """
    values_b64arr = b64_encode_float_array_as_float32(vds_fence_data)
    return SeismicIntersectionData(values_base64arr=values_b64arr, z_axis=z_axis)
