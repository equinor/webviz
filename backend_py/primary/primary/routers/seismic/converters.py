from typing import List

import orjson
import numpy as np
from numpy.typing import NDArray
import xtgeo

from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32
from primary.services.vds_access.response_types import VdsSliceMetadata
from . import schemas



def surface_to_float32_array(values: np.ndarray) -> List[float]:
    values = values.astype(np.float32)
    np.ma.set_fill_value(values, np.nan)
    values = np.ma.filled(values)

    # Rotate 90 deg left.
    # This will cause the width of to run along the X axis
    # and height of along Y axis (starting from bottom.)
    values = np.rot90(values)

    return values.flatten().tolist()


def to_api_surface_data(
    xtgeo_surf: xtgeo.RegularSurface, property_values: np.ndarray
) -> schemas.SurfaceMeshAndProperty:
    """
    Create API SurfaceData from xtgeo regular surface
    """
    float32_mesh = surface_to_float32_array(xtgeo_surf.values)
    float32_property = surface_to_float32_array(property_values)

    return schemas.SurfaceMeshAndProperty(
        x_ori=xtgeo_surf.xori,
        y_ori=xtgeo_surf.yori,
        x_count=xtgeo_surf.ncol,
        y_count=xtgeo_surf.nrow,
        x_inc=xtgeo_surf.xinc,
        y_inc=xtgeo_surf.yinc,
        x_min=xtgeo_surf.xmin,
        x_max=xtgeo_surf.xmax,
        y_min=xtgeo_surf.ymin,
        y_max=xtgeo_surf.ymax,
        mesh_value_min=xtgeo_surf.values.min(),
        mesh_value_max=xtgeo_surf.values.max(),
        property_value_min=property_values.min(),
        property_value_max=property_values.max(),
        rot_deg=xtgeo_surf.rotation,
        mesh_data=orjson.dumps(float32_mesh).decode("utf-8"),  # pylint: disable=maybe-no-member
        property_data=orjson.dumps(float32_property).decode("utf-8"),  # pylint: disable=maybe-no-member
    )

def to_api_vds_inline_data(
    flattened_slice_traces_array: NDArray[np.float32], metadata: VdsSliceMetadata) -> schemas.SeismicInlineData:
    """
    Create API SeismicInlineData from VdsSliceMetadata and flattened slice traces array
    """

    return schemas.SeismicInlineData(
        slice_traces_b64arr=b64_encode_float_array_as_float32(flattened_slice_traces_array),
        start_utm_x=metadata.geospatial[0][0],
        start_utm_y=metadata.geospatial[0][1],
        end_utm_x=metadata.geospatial[1][0],
        end_utm_y=metadata.geospatial[1][1],
        crossline_min=metadata.y["min"],
        crossline_max=metadata.y["max"],
        crossline_no_samples=metadata.y["samples"],
        z_min=metadata.x["min"],
        z_max=metadata.x["max"],
        z_samples=metadata.x["samples"],
        z_unit=metadata.x["unit"],
        value_min=np.nanmin(flattened_slice_traces_array),
        value_max=np.nanmax(flattened_slice_traces_array),
        
        )

def to_api_vds_crossline_data(
    flattened_slice_traces_array: NDArray[np.float32], metadata: VdsSliceMetadata) -> schemas.SeismicCrosslineData:
    """
    Create API SeismicCrosslineData from VdsSliceMetadata and flattened slice traces array
    """

    return schemas.SeismicCrosslineData(
        slice_traces_b64arr=b64_encode_float_array_as_float32(flattened_slice_traces_array),
        start_utm_x=metadata.geospatial[0][0],
        start_utm_y=metadata.geospatial[0][1],
        end_utm_x=metadata.geospatial[1][0],
        end_utm_y=metadata.geospatial[1][1],
        inline_min=metadata.y["min"],
        inline_max=metadata.y["max"],
        inline_no_samples=metadata.y["samples"],
        z_min=metadata.x["min"],
        z_max=metadata.x["max"],
        z_samples=metadata.x["samples"],
        z_unit=metadata.x["unit"],
        value_min=np.nanmin(flattened_slice_traces_array),
        value_max=np.nanmax(flattened_slice_traces_array),
        
        )