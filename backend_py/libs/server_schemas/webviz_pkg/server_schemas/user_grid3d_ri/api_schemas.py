from pydantic import BaseModel

from webviz_pkg.core_utils.b64 import B64FloatArray, B64UintArray, B64IntArray


class BoundingBox3D(BaseModel):
    min_x: float
    min_y: float
    min_z: float
    max_x: float
    max_y: float
    max_z: float


class GridDimensions(BaseModel):
    i_count: int
    j_count: int
    k_count: int


class IJKIndexFilter(BaseModel):
    min_i: int
    max_i: int
    min_j: int
    max_j: int
    min_k: int
    max_k: int


class Stats(BaseModel):
    # All timings are in milliseconds
    total_time: int
    perf_metrics: dict[str, int]
    ri_total_time: int | None = None
    ri_perf_metrics: dict[str, int] | None = None
    vertex_count: int
    poly_count: int


class GridGeometryRequest(BaseModel):
    sas_token: str
    blob_store_base_uri: str
    grid_blob_object_uuid: str
    include_inactive_cells: bool
    ijk_index_filter: IJKIndexFilter | None


class GridGeometryResponse(BaseModel):
    vertices_b64arr: B64FloatArray
    polys_b64arr: B64UintArray
    poly_source_cell_indices_b64arr: B64UintArray
    origin_utm_x: float
    origin_utm_y: float
    grid_dimensions: GridDimensions
    bounding_box: BoundingBox3D
    stats: Stats | None


class MappedGridPropertiesRequest(BaseModel):
    sas_token: str
    blob_store_base_uri: str
    grid_blob_object_uuid: str
    property_blob_object_uuid: str
    include_inactive_cells: bool
    ijk_index_filter: IJKIndexFilter | None


class MappedGridPropertiesResponse(BaseModel):
    poly_props_b64arr: B64FloatArray | B64IntArray
    undefined_int_value: int | None
    min_grid_prop_value: float | int
    max_grid_prop_value: float | int
    stats: Stats | None


class PolylineIntersectionRequest(BaseModel):
    sas_token: str
    blob_store_base_uri: str
    grid_blob_object_uuid: str
    property_blob_object_uuid: str
    include_inactive_cells: bool
    polyline_utm_xy: list[float]


class FenceMeshSection(BaseModel):
    # U-axis defined by unit length vector from start to end, Z is global Z
    vertices_uz_b64arr: B64FloatArray
    poly_indices_b64arr: B64UintArray
    vertices_per_poly_b64arr: B64UintArray
    poly_source_cell_indices_b64arr: B64UintArray
    poly_props_b64arr: B64FloatArray | B64IntArray
    start_utm_x: float
    start_utm_y: float
    end_utm_x: float
    end_utm_y: float


class PolylineIntersectionResponse(BaseModel):
    fence_mesh_sections: list[FenceMeshSection]
    grid_dimensions: GridDimensions
    undefined_int_value: int | None
    min_grid_prop_value: float
    max_grid_prop_value: float
    stats: Stats | None
