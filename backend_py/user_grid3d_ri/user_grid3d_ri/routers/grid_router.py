import logging

import grpc
import numpy as np
from fastapi import APIRouter

from rips.generated import GridGeometryExtraction_pb2, GridGeometryExtraction_pb2_grpc
import rips

from user_grid3d_ri.logic.data_cache import DataCache
from user_grid3d_ri.logic.grid_properties import GridPropertiesExtractor
from user_grid3d_ri.logic.local_blob_cache import LocalBlobCache
from user_grid3d_ri.logic.resinsight_manager import RESINSIGHT_MANAGER
from user_grid3d_ri.shared_utils.b64 import b64_encode_float_array_as_float32, b64_encode_uint_array_as_smallest_size
from user_grid3d_ri.shared_utils.perf_timer import PerfTimer

from . import api_schemas

LOGGER = logging.getLogger(__name__)


router = APIRouter()


@router.post("/get_grid_geometry")
async def post_get_grid_geometry(
    req_body: api_schemas.GridGeometryRequest,
) -> api_schemas.GridGeometryResponse:

    timer = PerfTimer()

    LOGGER.debug(f"post_get_grid_geometry()")
    LOGGER.debug(f"{req_body.sas_token=}")
    LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    LOGGER.debug(f"{req_body.ijk_index_filter=}")

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_blob_downloaded(req_body.grid_blob_object_uuid, ".roff")
    LOGGER.debug(f"{grid_path_name=}")
    et_get_blob_s = timer.lap_s()

    grpc_channel: grpc.Channel = RESINSIGHT_MANAGER.get_channel_for_running_ri_instance()
    et_get_ri_s = timer.lap_s()

    # !!!!!!!!!!!!!!!!!!!!!!!
    ri_instance = rips.Instance(port=RESINSIGHT_MANAGER.get_port_of_running_ri_instance(), launched=True)
    LOGGER.debug(f"{ri_instance.client_version_string()=}")
    LOGGER.debug(f"{ri_instance.version_string()=}")
    LOGGER.debug(f"{len(ri_instance.project.views())=}")
    LOGGER.debug(f"{len(ri_instance.project.cases())=}")

    data_cache = DataCache()
    response = data_cache.get_message_GetGridSurfaceResponse(req_body.grid_blob_object_uuid)
    response = None  # force re-fetch
    et_read_cache_s = timer.lap_s()

    if response is None:
        grid_geometry_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)

        effective_ijk_index_filter = None
        if req_body.ijk_index_filter:
            effective_ijk_index_filter = GridGeometryExtraction_pb2.IJKIndexFilter(
                iMin=req_body.ijk_index_filter.min_i,
                iMax=req_body.ijk_index_filter.max_i,
                jMin=req_body.ijk_index_filter.min_j,
                jMax=req_body.ijk_index_filter.max_j,
                kMin=req_body.ijk_index_filter.min_k,
                kMax=req_body.ijk_index_filter.max_k,
            )
        LOGGER.debug(f"{effective_ijk_index_filter=}")

        timer.lap_s()

        request = GridGeometryExtraction_pb2.GetGridSurfaceRequest(
            gridFilename=grid_path_name,
            ijkIndexFilter=effective_ijk_index_filter,
            cellIndexFilter=None,
            propertyFilter=None,
        )

        response: GridGeometryExtraction_pb2.GetGridSurfaceResponse = grid_geometry_extraction_stub.GetGridSurface(
            request
        )

    et_grid_geo_s = timer.lap_s()

    data_cache.set_message_GetGridSurfaceResponse(req_body.grid_blob_object_uuid, response)
    et_write_cache_s = timer.lap_s()

    grid_dims = response.gridDimensions
    cell_count = grid_dims.i * grid_dims.j * grid_dims.k
    LOGGER.debug(f"{grid_dims=}")
    LOGGER.debug(f"{cell_count=}")

    LOGGER.debug(f"{len(response.quadIndicesArr)=}")
    LOGGER.debug(f"{len(response.sourceCellIndicesArr)=}")

    vertices_np = np.asarray(response.vertexArray, dtype=np.float32)
    vertices_np = vertices_np.reshape(-1, 3)
    # LOGGER.debug(f"{vertices_np[:5]=}")

    # !!!!
    # HACK, adding UTM origin to vertices
    origin_utm = response.originUtm
    vertices_np = np.add(vertices_np, [origin_utm.x, origin_utm.y, origin_utm.z])
    # LOGGER.debug(f"{vertices_np[:5]=}")

    min_coord = np.min(vertices_np, axis=0)
    max_coord = np.max(vertices_np, axis=0)
    LOGGER.debug(f"{min_coord=}")
    LOGGER.debug(f"{max_coord=}")

    et_proc_verts_s = timer.lap_s()

    poly_indices_np = np.asarray(response.quadIndicesArr, dtype=np.int32)
    poly_indices_np = poly_indices_np.reshape(-1, 4)
    poly_indices_np = np.insert(poly_indices_np, 0, 4, axis=1).reshape(-1)
    # LOGGER.debug(f"{poly_indices_np[:20]=}")
    et_proc_indices_s = timer.lap_s()

    source_cell_indices_np = np.asarray(response.sourceCellIndicesArr, dtype=np.uint32)

    ret_obj = api_schemas.GridGeometryResponse(
        vertices_b64arr=b64_encode_float_array_as_float32(vertices_np),
        polys_b64arr=b64_encode_uint_array_as_smallest_size(poly_indices_np),
        poly_source_cell_indices_b64arr=b64_encode_uint_array_as_smallest_size(source_cell_indices_np),
        origin_utm_x=origin_utm.x,
        origin_utm_y=origin_utm.y,
        bounding_box=api_schemas.BoundingBox3D(
            min_x=min_coord[0],
            min_y=min_coord[1],
            min_z=min_coord[2],
            max_x=max_coord[0],
            max_y=max_coord[1],
            max_z=max_coord[2],
        ),
    )

    et_encode_s = timer.lap_s()

    LOGGER.debug(
        f"Got grid geometry in {timer.elapsed_s():.2f}s [{et_get_blob_s=:.2f}, {et_get_ri_s=:.2f}, {et_read_cache_s=:.2f}, {et_write_cache_s=:.2f}, {et_grid_geo_s=:.2f}, {et_proc_verts_s=:.2f}, {et_proc_indices_s=:.2f}, {et_encode_s=:.2f}]"
    )

    return ret_obj


@router.post("/get_mapped_grid_properties")
async def post_get_mapped_grid_properties(
    req_body: api_schemas.MappedGridPropertiesRequest,
) -> api_schemas.MappedGridPropertiesResponse:

    LOGGER.debug(f"post_get_mapped_grid_properties()")
    LOGGER.debug(f"{req_body.sas_token=}")
    LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    LOGGER.debug(f"{req_body.property_blob_object_uuid=}")
    LOGGER.debug(f"{req_body.ijk_index_filter=}")

    timer = PerfTimer()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_blob_downloaded(req_body.grid_blob_object_uuid, ".roff")
    LOGGER.debug(f"{grid_path_name=}")
    property_path_name = await blob_cache.ensure_blob_downloaded(req_body.property_blob_object_uuid, ".roff")
    LOGGER.debug(f"{property_path_name=}")
    et_get_blobs_s = timer.lap_s()

    # data_cache = DataCache()
    # source_cell_indices_np = data_cache.get_uint32_numpy_arr(grid_blob_object_uuid)
    # et_read_cache_s = timer.lap_s()
    source_cell_indices_np = None
    et_read_cache_s = -1

    et_get_ri_s = -1
    et_grid_geo_s = -1
    et_write_cache_s = -1
    if source_cell_indices_np is None:
        grpc_channel: grpc.Channel = RESINSIGHT_MANAGER.get_channel_for_running_ri_instance()
        et_get_ri_s = timer.lap_s()

        effective_ijk_index_filter = None
        if req_body.ijk_index_filter:
            effective_ijk_index_filter = GridGeometryExtraction_pb2.IJKIndexFilter(
                iMin=req_body.ijk_index_filter.min_i,
                iMax=req_body.ijk_index_filter.max_i,
                jMin=req_body.ijk_index_filter.min_j,
                jMax=req_body.ijk_index_filter.max_j,
                kMin=req_body.ijk_index_filter.min_k,
                kMax=req_body.ijk_index_filter.max_k,
            )
        LOGGER.debug(f"{effective_ijk_index_filter=}")

        grid_geometry_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
        request = GridGeometryExtraction_pb2.GetGridSurfaceRequest(
            gridFilename=grid_path_name,
            ijkIndexFilter=effective_ijk_index_filter,
            cellIndexFilter=None,
            propertyFilter=None,
        )

        response: GridGeometryExtraction_pb2.GetGridSurfaceResponse = grid_geometry_extraction_stub.GetGridSurface(
            request
        )

        et_grid_geo_s = timer.lap_s()

        source_cell_indices_np = np.asarray(response.sourceCellIndicesArr, dtype=np.uint32)
        # data_cache.set_uint32_numpy_arr(grid_blob_object_uuid, source_cell_indices_np)
        # et_write_cache_s = timer.lap_s()

    LOGGER.debug(f"{type(source_cell_indices_np)=}")
    LOGGER.debug(f"{source_cell_indices_np.dtype=}")

    prop_extractor = GridPropertiesExtractor.from_roff_property_file(property_path_name)
    poly_prop_vals = prop_extractor.get_prop_values_for_cells(source_cell_indices_np)
    # LOGGER.debug(f"{poly_prop_vals[:20]=}")
    et_proc_props_s = timer.lap_s()

    ret_obj = api_schemas.MappedGridPropertiesResponse(
        poly_props_b64arr=b64_encode_float_array_as_float32(poly_prop_vals),
        dbg_poly_props_arr=poly_prop_vals,
        min_grid_prop_value=prop_extractor.get_min_global_val(),
        max_grid_prop_value=prop_extractor.get_max_global_val(),
    )

    et_encode_s = timer.lap_s()

    LOGGER.debug(
        f"Got mapped grid properties in {timer.elapsed_s():.2f}s [{et_get_blobs_s=:.2f}, {et_get_ri_s=:.2f}, {et_read_cache_s=:.2f}, {et_grid_geo_s=:.2f}, {et_write_cache_s=:.2f}, {et_proc_props_s=:.2f}, {et_encode_s=:.2f}]"
    )

    return ret_obj
