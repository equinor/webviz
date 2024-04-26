from typing import List, Optional

from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray, B64UintArray


# Rename?
class Grid3dGeometry(BaseModel):
    polys_b64arr: B64UintArray
    points_b64arr: B64FloatArray
    poly_source_cell_indices_b64arr: B64UintArray
    origin_utm_x: float
    origin_utm_y: float
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    zmin: float
    zmax: float


# Rename?
class Grid3dMappedProperty(BaseModel):
    poly_props_b64arr: B64FloatArray
    min_grid_prop_value: float
    max_grid_prop_value: float


class BoundingBox3d(BaseModel):
    """Bounding box for a 3D grid geometry"""

    xmin: float
    ymin: float
    zmin: float
    xmax: float
    ymax: float
    zmax: float


class Grid3dZone(BaseModel):
    """Named subset of 3D grid layers (Zone)"""

    name: str
    start_layer: int
    end_layer: int


class Grid3dDimensions(BaseModel):
    """Specification of a 3D grid dimensions"""

    i_count: int
    j_count: int
    k_count: int
    subgrids: List[Grid3dZone]


class Grid3dPropertyInfo(BaseModel):
    """Metadata for a 3D grid property"""

    property_name: str
    iso_date_or_interval: Optional[str] = None


class Grid3dInfo(BaseModel):
    """Metadata for a 3D grid model, including its properties and geometry"""

    grid_name: str
    bbox: BoundingBox3d
    dimensions: Grid3dDimensions
    property_info_arr: List[Grid3dPropertyInfo]
