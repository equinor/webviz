import numpy as np
from numpy.typing import NDArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32

from primary.services.vds_access.response_types import VdsSliceMetadata
from . import schemas


def to_api_vds_slice_data(
    flattened_slice_traces_array: NDArray[np.float32], metadata: VdsSliceMetadata
) -> schemas.SeismicSliceData:
    """
    Create API SeismicCrosslineData from VdsSliceMetadata and flattened slice traces array
    """

    return schemas.SeismicSliceData(
        slice_traces_b64arr=b64_encode_float_array_as_float32(flattened_slice_traces_array),
        bbox_utm=metadata.geospatial,
        u_min=metadata.x["min"],
        u_max=metadata.x["max"],
        u_num_samples=metadata.x["samples"],
        u_unit=metadata.x["unit"],
        v_min=metadata.y["min"],
        v_max=metadata.y["max"],
        v_num_samples=metadata.y["samples"],
        v_unit=metadata.y["unit"],
        value_min=np.nanmin(flattened_slice_traces_array),
        value_max=np.nanmax(flattened_slice_traces_array),
    )
