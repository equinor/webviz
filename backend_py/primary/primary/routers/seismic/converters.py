from typing import List
import math

import orjson
import numpy as np
from numpy.typing import NDArray
import xtgeo

from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32
from primary.services.vds_access.response_types import VdsSliceMetadata
from . import schemas
from ..surface import schemas as surface_schemas
from primary.services.utils.surface_to_float32 import surface_to_float32_numpy_array

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
def to_api_vds_depth_slice_data(
    flattened_slice_traces_array: NDArray[np.float32], metadata: VdsSliceMetadata) -> surface_schemas.SurfaceDataFloat:
    """
    Create API SeismicCrosslineData from VdsSliceMetadata and flattened slice traces array
    """
    # VdsSliceMetadata(format='<f4', shape=[461, 1008], 
    # x={'annotation': 'Crossline', 'max': 1007.0, 'min': 0.0, 'samples': 1008, 'stepsize': 1.0, 'unit': 'unitless'}, 
    # y={'annotation': 'Inline', 'max': 460.0, 'min': 0.0, 'samples': 461, 'stepsize': 1.0, 'unit': 'unitless'}, 
    # geospatial=[[454371.0, 6803858.100000001], [444394.7, 6809578.49], [456917.45999999996, 6831418.013904556], [466893.75999999995, 6825697.623904556]])
    bounding_box = metadata.geospatial
    origin = bounding_box[0]
    # Translate all points relative to the origin
    translated_points = [
        [point[0] - origin[0], point[1] - origin[1]] 
        for point in bounding_box[1:]
    ]
    
    # Calculate angle between first translated point and x-axis
    first_point = translated_points[0]
    orientation = math.atan2(first_point[1], first_point[0])
    orient_degree = math.degrees(orientation) + 180
    
    ncol = metadata.y["samples"]
    nrow = metadata.x["samples"]
    xinc = 25
    yinc = 25
    xori = bounding_box[1][0]
    yori = bounding_box[1][1]
    
    xtgeo_surf = xtgeo.RegularSurface(
        values=np.flip(flattened_slice_traces_array.reshape((ncol,nrow)),axis=0),
        xori=xori,
        yori=yori,
        xinc=xinc,
        yinc=yinc,
        rotation=orient_degree,
        ncol=ncol,
        nrow=nrow,
        
        
    )
    print(xtgeo_surf)

    float32_np_arr: NDArray[np.float32] = surface_to_float32_numpy_array(xtgeo_surf)
    values_b64arr = b64_encode_float_array_as_float32(float32_np_arr)

    surface_def = surface_schemas.SurfaceDef(
        npoints_x=xtgeo_surf.ncol,
        npoints_y=xtgeo_surf.nrow,
        inc_x=xtgeo_surf.xinc,
        inc_y=xtgeo_surf.yinc,
        origin_utm_x=xtgeo_surf.xori,
        origin_utm_y=xtgeo_surf.yori,
        rot_deg=xtgeo_surf.rotation,
    )

    trans_bb_utm = surface_schemas.BoundingBox2d(
        min_x=xtgeo_surf.xmin, min_y=xtgeo_surf.ymin, max_x=xtgeo_surf.xmax, max_y=xtgeo_surf.ymax
    )

    return surface_schemas.SurfaceDataFloat(
        format="float",
        surface_def=surface_def,
        transformed_bbox_utm=trans_bb_utm,
        value_min=xtgeo_surf.values.min(),
        value_max=xtgeo_surf.values.max(),
        values_b64arr=values_b64arr,
    )
    

    # return schemas.SeismicInlineData(
    #     slice_traces_b64arr=b64_encode_float_array_as_float32(flattened_slice_traces_array),
    #     start_utm_x=metadata.geospatial[0][0],
    #     start_utm_y=metadata.geospatial[0][1],
    #     end_utm_x=metadata.geospatial[1][0],
    #     end_utm_y=metadata.geospatial[1][1],
    #     crossline_min=metadata.y["min"],
    #     crossline_max=metadata.y["max"],
    #     crossline_no_samples=metadata.y["samples"],
    #     z_min=metadata.x["min"],
    #     z_max=metadata.x["max"],
    #     z_samples=metadata.x["samples"],
    #     z_unit=metadata.x["unit"],
    #     value_min=np.nanmin(flattened_slice_traces_array),
    #     value_max=np.nanmax(flattened_slice_traces_array),
        
    #     )