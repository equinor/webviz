from pydantic import BaseModel
from webviz_pkg.core_utils.b64 import B64FloatArray, B64UintArray


class GridSurface(BaseModel):
    polys_b64arr: B64UintArray
    points_b64arr: B64FloatArray
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    zmin: float
    zmax: float
