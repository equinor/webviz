import numpy as np
from numpy.typing import NDArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32

from primary.services.vds_access.response_types import VdsSliceMetadata
from primary.services.sumo_access.seismic_types import SeismicCubeMeta
from . import schemas


def to_api_vds_cube_meta(seismic_meta: SeismicCubeMeta) -> schemas.SeismicCubeMeta:
    return schemas.SeismicCubeMeta(
        seismicAttribute=seismic_meta.seismic_attribute,
        unit=seismic_meta.unit,
        isoDateOrInterval=seismic_meta.iso_date_or_interval,
        isObservation=seismic_meta.is_observation,
        isDepth=seismic_meta.is_depth,
        bbox=schemas.BoundingBox3d(
            xmin=seismic_meta.bbox.xmin,
            ymin=seismic_meta.bbox.ymin,
            zmin=seismic_meta.bbox.zmin,
            xmax=seismic_meta.bbox.xmax,
            ymax=seismic_meta.bbox.ymax,
            zmax=seismic_meta.bbox.zmax,
        ),
        spec=schemas.SeismicCubeSpec(
            numCols=seismic_meta.spec.num_cols,
            numRows=seismic_meta.spec.num_rows,
            numLayers=seismic_meta.spec.num_layers,
            xOrigin=seismic_meta.spec.x_origin,
            yOrigin=seismic_meta.spec.y_origin,
            zOrigin=seismic_meta.spec.z_origin,
            xInc=seismic_meta.spec.x_inc,
            yInc=seismic_meta.spec.y_inc,
            zInc=seismic_meta.spec.z_inc,
            yFlip=seismic_meta.spec.y_flip,
            zFlip=seismic_meta.spec.z_flip,
            rotationDeg=seismic_meta.spec.rotation,
        ),
    )


def to_api_vds_slice_data(
    flattened_slice_traces_array: NDArray[np.float32], metadata: VdsSliceMetadata
) -> schemas.SeismicSliceData:
    return schemas.SeismicSliceData(
        slice_traces_b64arr=b64_encode_float_array_as_float32(flattened_slice_traces_array),
        bbox_utm=metadata.geospatial,
        u_min=metadata.x_axis.min,
        u_max=metadata.x_axis.max,
        u_num_samples=metadata.x_axis.samples,
        u_unit=metadata.x_axis.unit,
        v_min=metadata.y_axis.min,
        v_max=metadata.y_axis.max,
        v_num_samples=metadata.y_axis.samples,
        v_unit=metadata.y_axis.unit,
        value_min=np.nanmin(flattened_slice_traces_array).astype(float),
        value_max=np.nanmax(flattened_slice_traces_array).astype(float),
    )
