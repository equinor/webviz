import logging
from typing import Any

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

DATA_CACHE = DataCache()

router = APIRouter()


def _proto_msg_as_oneliner(proto_msg: Any) -> str:
    return str(proto_msg).replace("\n", ", ")


@router.post("/get_grid_geometry")
async def post_get_grid_geometry(
    req_body: api_schemas.GridGeometryRequest,
) -> api_schemas.GridGeometryResponse:

    myfunc = "post_get_grid_geometry()"
    LOGGER.debug(f"{myfunc}")
    # LOGGER.debug(f"{req_body.sas_token=}")
    # LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    # LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.include_inactive_cells=}")
    # LOGGER.debug(f"{req_body.ijk_index_filter=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    if grid_path_name is None:
        raise HTTPException(500, detail=f"Failed to download grid blob: {req_body.grid_blob_object_uuid=}")
    LOGGER.debug(f"{myfunc} - {grid_path_name=}")
    perf_metrics.record_lap("get-blob")

    grpc_channel: grpc.aio.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
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

    perf_metrics.reset_lap_timer()

    request = GridGeometryExtraction_pb2.GetGridSurfaceRequest(
        gridFilename=grid_path_name,
        includeInactiveCells=req_body.include_inactive_cells,
        ijkIndexFilter=grpc_ijk_index_filter,
        cellIndexFilter=None,
        propertyFilter=None,
    )

    geo_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
    grpc_response = await geo_extraction_stub.GetGridSurface(request)

    perf_metrics.record_lap("ri-grid-geo")

    grid_dims = grpc_response.gridDimensions
    cell_count = grid_dims.i * grid_dims.j * grid_dims.k
    LOGGER.debug(f"{myfunc} - grid_dims: {_proto_msg_as_oneliner(grid_dims)}")
    LOGGER.debug(f"{myfunc} - {cell_count=}")
    LOGGER.debug(f"{myfunc} - {len(grpc_response.quadIndicesArr)=}")
    LOGGER.debug(f"{myfunc} - {len(grpc_response.sourceCellIndicesArr)=}")

    vertices_np = np.asarray(grpc_response.vertexArray, dtype=np.float32)
    vertices_np = vertices_np.reshape(-1, 3)

    min_coord = np.min(vertices_np, axis=0)
    max_coord = np.max(vertices_np, axis=0)
    LOGGER.debug(f"{min_coord=}")
    LOGGER.debug(f"{max_coord=}")

    perf_metrics.record_lap("proc-verts")

    poly_indices_np = np.asarray(grpc_response.quadIndicesArr, dtype=np.int32)
    poly_indices_np = poly_indices_np.reshape(-1, 4)
    poly_indices_np = np.insert(poly_indices_np, 0, 4, axis=1).reshape(-1)
    perf_metrics.record_lap("proc-indices")

    source_cell_indices_np = np.asarray(grpc_response.sourceCellIndicesArr, dtype=np.uint32)

    data_cache_key = _make_grid_geo_key(
        grid_blob_object_uuid=req_body.grid_blob_object_uuid,
        include_inactive_cells=req_body.include_inactive_cells,
        filter=req_body.ijk_index_filter,
    )
    LOGGER.debug(f"{myfunc} - {data_cache_key=}")
    DATA_CACHE.set_uint32_numpy_arr(data_cache_key, source_cell_indices_np)
    perf_metrics.record_lap("write-cache")

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
    # LOGGER.debug(f"{req_body.include_inactive_cells=}")
    # LOGGER.debug(f"{req_body.ijk_index_filter=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    property_path_name = await blob_cache.ensure_property_blob_downloaded_async(req_body.property_blob_object_uuid)

    if grid_path_name is None:
        raise HTTPException(500, detail=f"Failed to download grid blob: {req_body.grid_blob_object_uuid=}")
    if property_path_name is None:
        raise HTTPException(500, detail=f"Failed to download property blob: {req_body.property_blob_object_uuid=}")

    LOGGER.debug(f"{myfunc} - {grid_path_name=}")
    LOGGER.debug(f"{myfunc} - {property_path_name=}")
    perf_metrics.record_lap("get-blobs")

    source_cell_indices_np = None
    data_cache_key = _make_grid_geo_key(
        grid_blob_object_uuid=req_body.grid_blob_object_uuid,
        include_inactive_cells=req_body.include_inactive_cells,
        filter=req_body.ijk_index_filter,
    )
    LOGGER.debug(f"{myfunc} - {data_cache_key=}")
    source_cell_indices_np = DATA_CACHE.get_uint32_numpy_arr(data_cache_key)
    perf_metrics.record_lap("read-cache")

    ri_total_time: int | None = None
    ri_perf_metrics: dict[str, int] | None = None

    if source_cell_indices_np is None:
        grpc_channel: grpc.aio.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
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

        request = GridGeometryExtraction_pb2.GetGridSurfaceRequest(
            gridFilename=grid_path_name,
            includeInactiveCells=req_body.include_inactive_cells,
            ijkIndexFilter=grpc_ijk_index_filter,
            cellIndexFilter=None,
            propertyFilter=None,
        )

        geo_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
        grpc_response = await geo_extraction_stub.GetGridSurface(request)

        ri_total_time = grpc_response.timeElapsedInfo.totalTimeElapsedMs
        ri_perf_metrics = dict(grpc_response.timeElapsedInfo.namedEventsAndTimeElapsedMs)
        perf_metrics.record_lap("ri-grid-geo")

        source_cell_indices_np = np.asarray(grpc_response.sourceCellIndicesArr, dtype=np.uint32)
        DATA_CACHE.set_uint32_numpy_arr(data_cache_key, source_cell_indices_np)
        perf_metrics.record_lap("write-cache")

    prop_extractor = await GridPropertiesExtractor.from_roff_property_file_async(property_path_name)
    perf_metrics.record_lap("read-props")

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

    ret_obj.stats = api_schemas.Stats(
        total_time=perf_metrics.get_elapsed_ms(),
        perf_metrics=perf_metrics.to_dict(),
        ri_total_time=ri_total_time,
        ri_perf_metrics=ri_perf_metrics,
        vertex_count=-1,
        poly_count=int(len(source_cell_indices_np)),
    )

    LOGGER.debug(f"{myfunc} - Got mapped grid properties in: {perf_metrics.to_string_s()}")

    return ret_obj


def _make_grid_geo_key(
    grid_blob_object_uuid: str, include_inactive_cells: bool, filter: api_schemas.IJKIndexFilter | None
) -> str:
    filter_str = "NoFilter"
    if filter:
        filter_str = (
            f"I[{filter.min_i},{filter.max_i}]-J[{filter.min_j},{filter.max_j}]-K[{filter.min_k},{filter.max_k}]"
        )

    return f"{grid_blob_object_uuid}--IncludeInactive{include_inactive_cells}--{filter_str}"
