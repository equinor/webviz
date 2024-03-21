import logging

import grpc
import numpy as np
from fastapi import APIRouter, HTTPException

import rips
from rips.generated import GridGeometryExtraction_pb2, GridGeometryExtraction_pb2_grpc

from webviz_pkg.core_utils.b64 import B64FloatArray, B64IntArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32
from webviz_pkg.core_utils.b64 import b64_encode_uint_array_as_smallest_size, b64_encode_int_array_as_smallest_size
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from webviz_pkg.server_schemas.user_grid3d_ri import api_schemas

from user_grid3d_ri.logic.data_cache import DataCache
from user_grid3d_ri.logic.grid_properties import GridPropertiesExtractor
from user_grid3d_ri.logic.local_blob_cache import LocalBlobCache
from user_grid3d_ri.logic.resinsight_manager import RESINSIGHT_MANAGER

LOGGER = logging.getLogger(__name__)


router = APIRouter()


def _proto_msg_as_oneliner(msg):
    return str(msg).replace("\n", ", ")


@router.post("/get_grid_geometry")
async def post_get_grid_geometry(
    req_body: api_schemas.GridGeometryRequest,
) -> api_schemas.GridGeometryResponse:

    myfunc = "post_get_grid_geometry()"
    LOGGER.debug(f"{myfunc}")
    # LOGGER.debug(f"{req_body.sas_token=}")
    # LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    # LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.ijk_index_filter=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    if grid_path_name is None:
        raise HTTPException(status_code=500, detail=f"Failed to download grid blob: {req_body.grid_blob_object_uuid=}")
    LOGGER.debug(f"{myfunc} - {grid_path_name=}")
    perf_metrics.record_lap("get-blob")

    grpc_channel: grpc.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
    perf_metrics.record_lap("get-ri")

    # !!!!!!!!!!!!!!!!!!!!!!!
    # ri_instance = rips.Instance(port=await RESINSIGHT_MANAGER.get_port_of_running_ri_instance_async(), launched=True)
    # LOGGER.debug(f"{ri_instance.client_version_string()=}")
    # LOGGER.debug(f"{ri_instance.version_string()=}")
    # LOGGER.debug(f"{len(ri_instance.project.views())=}")
    # LOGGER.debug(f"{len(ri_instance.project.cases())=}")

    # data_cache = DataCache()
    # response = data_cache.get_message_GetGridSurfaceResponse(req_body.grid_blob_object_uuid)
    # et_read_cache_s = timer.lap_s()
    grpc_response = None

    if grpc_response is None:
        grid_geometry_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)

        grpc_ijk_index_filter = None
        if req_body.ijk_index_filter:
            grpc_ijk_index_filter = GridGeometryExtraction_pb2.IJKIndexFilter(
                iMin=req_body.ijk_index_filter.min_i,
                iMax=req_body.ijk_index_filter.max_i,
                jMin=req_body.ijk_index_filter.min_j,
                jMax=req_body.ijk_index_filter.max_j,
                kMin=req_body.ijk_index_filter.min_k,
                kMax=req_body.ijk_index_filter.max_k,
            )
        LOGGER.debug(f"{myfunc} - grpc_ijk_index_filter: {_proto_msg_as_oneliner(grpc_ijk_index_filter)}")

        perf_metrics.reset_lap_timer()

        request = GridGeometryExtraction_pb2.GetGridSurfaceRequest(
            gridFilename=grid_path_name,
            ijkIndexFilter=grpc_ijk_index_filter,
            cellIndexFilter=None,
            propertyFilter=None,
        )

        grpc_response: GridGeometryExtraction_pb2.GetGridSurfaceResponse = grid_geometry_extraction_stub.GetGridSurface(
            request
        )

    perf_metrics.record_lap("ri-grid-geo")

    # data_cache.set_message_GetGridSurfaceResponse(req_body.grid_blob_object_uuid, response)
    # et_write_cache_s = timer.lap_s()

    grid_dims = grpc_response.gridDimensions
    cell_count = grid_dims.i * grid_dims.j * grid_dims.k
    LOGGER.debug(f"{myfunc} - grid_dims: {_proto_msg_as_oneliner(grid_dims)}")
    LOGGER.debug(f"{myfunc} - {cell_count=}")

    LOGGER.debug(f"{myfunc} - {len(grpc_response.quadIndicesArr)=}")
    LOGGER.debug(f"{myfunc} - {len(grpc_response.sourceCellIndicesArr)=}")

    vertices_np = np.asarray(grpc_response.vertexArray, dtype=np.float32)
    vertices_np = vertices_np.reshape(-1, 3)
    # LOGGER.debug(f"{vertices_np[:5]=}")

    min_coord = np.min(vertices_np, axis=0)
    max_coord = np.max(vertices_np, axis=0)
    LOGGER.debug(f"{min_coord=}")
    LOGGER.debug(f"{max_coord=}")

    perf_metrics.record_lap("proc-verts")

    poly_indices_np = np.asarray(grpc_response.quadIndicesArr, dtype=np.int32)
    poly_indices_np = poly_indices_np.reshape(-1, 4)
    poly_indices_np = np.insert(poly_indices_np, 0, 4, axis=1).reshape(-1)
    # LOGGER.debug(f"{poly_indices_np[:20]=}")
    perf_metrics.record_lap("proc-indices")

    source_cell_indices_np = np.asarray(grpc_response.sourceCellIndicesArr, dtype=np.uint32)

    ret_obj = api_schemas.GridGeometryResponse(
        vertices_b64arr=b64_encode_float_array_as_float32(vertices_np),
        polys_b64arr=b64_encode_uint_array_as_smallest_size(poly_indices_np),
        poly_source_cell_indices_b64arr=b64_encode_uint_array_as_smallest_size(source_cell_indices_np),
        origin_utm_x=grpc_response.originUtmXy.x,
        origin_utm_y=grpc_response.originUtmXy.y,
        grid_dimensions=api_schemas.GridDimensions(
            i_count=grpc_response.gridDimensions.i,
            j_count=grpc_response.gridDimensions.j,
            k_count=grpc_response.gridDimensions.k,
        ),
        bounding_box=api_schemas.BoundingBox3D(
            min_x=min_coord[0],
            min_y=min_coord[1],
            min_z=min_coord[2],
            max_x=max_coord[0],
            max_y=max_coord[1],
            max_z=max_coord[2],
        ),
        stats=None,
    )
    perf_metrics.record_lap("make-response")

    grpc_timeElapsedInfo = grpc_response.timeElapsedInfo
    ret_obj.stats = api_schemas.Stats(
        total_time=perf_metrics.get_elapsed_ms(),
        perf_metrics=perf_metrics.to_dict(),
        ri_total_time=grpc_timeElapsedInfo.totalTimeElapsedMs,
        ri_perf_metrics=dict(grpc_timeElapsedInfo.namedEventsAndTimeElapsedMs),
        vertex_count=int(len(vertices_np) / 3),
        poly_count=int(len(source_cell_indices_np)),
    )

    LOGGER.debug(f"{myfunc} - Got grid geometry in: {perf_metrics.to_string_s()}")

    return ret_obj


@router.post("/get_mapped_grid_properties")
async def post_get_mapped_grid_properties(
    req_body: api_schemas.MappedGridPropertiesRequest,
) -> api_schemas.MappedGridPropertiesResponse:

    myfunc = "post_get_mapped_grid_properties()"
    LOGGER.debug(f"{myfunc}")
    # LOGGER.debug(f"{req_body.sas_token=}")
    # LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    # LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.property_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.ijk_index_filter=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    property_path_name = await blob_cache.ensure_property_blob_downloaded_async(req_body.property_blob_object_uuid)

    if grid_path_name is None:
        raise HTTPException(status_code=500, detail=f"Failed to download grid blob: {req_body.grid_blob_object_uuid=}")
    if property_path_name is None:
        raise HTTPException(status_code=500, detail=f"Failed to download property blob: {req_body.property_blob_object_uuid=}")

    LOGGER.debug(f"{myfunc} - {grid_path_name=}")
    LOGGER.debug(f"{myfunc} - {property_path_name=}")
    perf_metrics.record_lap("get-blobs")

    # data_cache = DataCache()
    # source_cell_indices_np = data_cache.get_uint32_numpy_arr(grid_blob_object_uuid)
    # et_read_cache_s = timer.lap_s()
    source_cell_indices_np = None

    if source_cell_indices_np is None:
        grpc_channel: grpc.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
        perf_metrics.record_lap("get-ri")

        grpc_ijk_index_filter = None
        if req_body.ijk_index_filter:
            grpc_ijk_index_filter = GridGeometryExtraction_pb2.IJKIndexFilter(
                iMin=req_body.ijk_index_filter.min_i,
                iMax=req_body.ijk_index_filter.max_i,
                jMin=req_body.ijk_index_filter.min_j,
                jMax=req_body.ijk_index_filter.max_j,
                kMin=req_body.ijk_index_filter.min_k,
                kMax=req_body.ijk_index_filter.max_k,
            )
        LOGGER.debug(f"{myfunc} - grpc_ijk_index_filter: {_proto_msg_as_oneliner(grpc_ijk_index_filter)}")

        grid_geometry_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
        request = GridGeometryExtraction_pb2.GetGridSurfaceRequest(
            gridFilename=grid_path_name,
            ijkIndexFilter=grpc_ijk_index_filter,
            cellIndexFilter=None,
            propertyFilter=None,
        )

        grpc_response: GridGeometryExtraction_pb2.GetGridSurfaceResponse = grid_geometry_extraction_stub.GetGridSurface(
            request
        )

        perf_metrics.record_lap("ri-grid-geo")

        source_cell_indices_np = np.asarray(grpc_response.sourceCellIndicesArr, dtype=np.uint32)
        # data_cache.set_uint32_numpy_arr(grid_blob_object_uuid, source_cell_indices_np)
        # et_write_cache_s = timer.lap_s()

    LOGGER.debug(f"{type(source_cell_indices_np)=}")
    LOGGER.debug(f"{source_cell_indices_np.dtype=}")

    prop_extractor = GridPropertiesExtractor.from_roff_property_file(property_path_name)
    poly_props_b64arr: B64FloatArray | B64IntArray
    undefined_int_value: int | None = None
    if prop_extractor.is_discrete():
        int_prop_arr_np = prop_extractor.get_discrete_prop_values_for_cells(source_cell_indices_np)
        poly_props_b64arr = b64_encode_int_array_as_smallest_size(int_prop_arr_np)
        undefined_int_value = prop_extractor.get_discrete_undef_value()
    else:
        float_prop_arr_np = prop_extractor.get_float_prop_values_for_cells(source_cell_indices_np)
        poly_props_b64arr = b64_encode_float_array_as_float32(float_prop_arr_np)

    perf_metrics.record_lap("proc-props")

    ret_obj = api_schemas.MappedGridPropertiesResponse(
        poly_props_b64arr=poly_props_b64arr,
        undefined_int_value=undefined_int_value,
        min_grid_prop_value=prop_extractor.get_min_global_val(),
        max_grid_prop_value=prop_extractor.get_max_global_val(),
        stats=None,
    )
    perf_metrics.record_lap("make-response")

    grpc_timeElapsedInfo = grpc_response.timeElapsedInfo
    ret_obj.stats = api_schemas.Stats(
        total_time=perf_metrics.get_elapsed_ms(),
        perf_metrics=perf_metrics.to_dict(),
        ri_total_time=grpc_timeElapsedInfo.totalTimeElapsedMs,
        ri_perf_metrics=dict(grpc_timeElapsedInfo.namedEventsAndTimeElapsedMs),
        vertex_count=-1,
        poly_count=int(len(source_cell_indices_np)),
    )

    LOGGER.debug(f"{myfunc} - Got mapped grid properties in: {perf_metrics.to_string_s()}")

    return ret_obj
