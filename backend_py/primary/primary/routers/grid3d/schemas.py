from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray, B64UintArray


# Rename this to GridGeometry?
class GridSurface(BaseModel):
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


# Rename this to MappedGridProperties?
class GridParameter(BaseModel):
    # poly_props_b64arr: B64FloatArray
    poly_props_arr: list[float]
