import logging

import grpc
from fastapi import APIRouter, HTTPException

from rips.generated import GridGeometryExtraction_pb2, GridGeometryExtraction_pb2_grpc
from rips.instance import *

from webviz_pkg.core_utils.b64 import B64FloatArray, B64IntArray
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32
from webviz_pkg.core_utils.b64 import b64_encode_uint_array_as_uint32, b64_encode_uint_array_as_uint8
from webviz_pkg.core_utils.b64 import b64_encode_uint_array_as_smallest_size, b64_encode_int_array_as_smallest_size
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from webviz_pkg.server_schemas.user_grid3d_ri import api_schemas

from user_grid3d_ri.logic.grid_properties import GridPropertiesExtractor
from user_grid3d_ri.logic.local_blob_cache import LocalBlobCache
from user_grid3d_ri.logic.resinsight_manager import RESINSIGHT_MANAGER

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.post("/get_polyline_intersection")
async def post_get_polyline_intersection(
    req_body: api_schemas.PolylineIntersectionRequest,
) -> api_schemas.PolylineIntersectionResponse:

    myfunc = "post_get_polyline_intersection()"
    LOGGER.debug(f"{myfunc}")
    # LOGGER.debug(f"{req_body.sas_token=}")
    # LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    # LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.property_blob_object_uuid=}")
    # LOGGER.debug(f"{len(req_body.polyline_utm_xy)=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    LOGGER.debug(f"{myfunc} - {grid_path_name=}")
    if grid_path_name is None:
        raise HTTPException(500, detail=f"Failed to download grid blob: {req_body.grid_blob_object_uuid=}")
    perf_metrics.record_lap("get-grid-blob")

    property_path_name = await blob_cache.ensure_property_blob_downloaded_async(req_body.property_blob_object_uuid)
    LOGGER.debug(f"{myfunc} - {property_path_name=}")
    if property_path_name is None:
        raise HTTPException(500, detail=f"Failed to download property blob: {req_body.property_blob_object_uuid=}")
    perf_metrics.record_lap("get-prop-blob")

    grpc_channel: grpc.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
    perf_metrics.record_lap("get-ri")

    grpc_request = GridGeometryExtraction_pb2.CutAlongPolylineRequest(
        gridFilename=grid_path_name,
        fencePolylineUtmXY=req_body.polyline_utm_xy,
    )

    geo_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
    grpc_response = await geo_extraction_stub.CutAlongPolyline(grpc_request)
    perf_metrics.record_lap("ri-cut")

    LOGGER.debug(f"{myfunc} - {len(grpc_response.fenceMeshSections)=}")

    prop_extractor = await GridPropertiesExtractor.from_roff_property_file_async(property_path_name)
    perf_metrics.record_lap("read-props")

    min_global_prop_value = prop_extractor.get_min_global_val()
    max_global_prop_value = prop_extractor.get_max_global_val()
    undefined_int_value: int | None = None
    if prop_extractor.is_discrete():
        undefined_int_value = prop_extractor.get_discrete_undef_value()

    LOGGER.debug(f"{myfunc} - {prop_extractor.is_discrete()=}")
    LOGGER.debug(f"{myfunc} - {min_global_prop_value=}")
    LOGGER.debug(f"{myfunc} - {max_global_prop_value=}")
    LOGGER.debug(f"{myfunc} - {undefined_int_value=}")

    ret_sections: list[api_schemas.FenceMeshSection] = []
    tot_num_vertices: int = 0
    tot_num_polys: int = 0
    for fence_idx, grpc_section in enumerate(grpc_response.fenceMeshSections):
        poly_props_b64arr: B64FloatArray | B64IntArray
        if prop_extractor.is_discrete():
            int_prop_arr_np = prop_extractor.get_discrete_prop_values_for_cells(grpc_section.sourceCellIndicesArr)
            min_int_val = int(min_global_prop_value)
            max_int_val = int(max_global_prop_value)
            poly_props_b64arr = b64_encode_int_array_as_smallest_size(int_prop_arr_np, min_int_val, max_int_val)
        else:
            float_prop_arr_np = prop_extractor.get_float_prop_values_for_cells(grpc_section.sourceCellIndicesArr)
            poly_props_b64arr = b64_encode_float_array_as_float32(float_prop_arr_np)

        max_vertex_index = int(len(grpc_section.vertexArrayUZ) / 2) - 1

        section = api_schemas.FenceMeshSection(
            vertices_uz_b64arr=b64_encode_float_array_as_float32(grpc_section.vertexArrayUZ),
            poly_indices_b64arr=b64_encode_uint_array_as_smallest_size(grpc_section.polyIndicesArr, max_vertex_index),
            vertices_per_poly_b64arr=b64_encode_uint_array_as_uint8(grpc_section.verticesPerPolygonArr),
            poly_source_cell_indices_b64arr=b64_encode_uint_array_as_uint32(grpc_section.sourceCellIndicesArr),
            poly_props_b64arr=poly_props_b64arr,
            start_utm_x=grpc_section.startUtmXY.x,
            start_utm_y=grpc_section.startUtmXY.y,
            end_utm_x=grpc_section.endUtmXY.x,
            end_utm_y=grpc_section.endUtmXY.y,
        )
        ret_sections.append(section)

        tot_num_vertices += int(len(grpc_section.vertexArrayUZ) / 2)
        tot_num_polys += len(grpc_section.sourceCellIndicesArr)

    perf_metrics.record_lap("process-sections")

    # This actually takes a bit of time (for many sections) - could use model_construct() for a slight perf gain
    ret_obj = api_schemas.PolylineIntersectionResponse(
        fence_mesh_sections=ret_sections,
        undefined_int_value=undefined_int_value,
        min_grid_prop_value=min_global_prop_value,
        max_grid_prop_value=max_global_prop_value,
        grid_dimensions=api_schemas.GridDimensions(
            i_count=grpc_response.gridDimensions.i,
            j_count=grpc_response.gridDimensions.j,
            k_count=grpc_response.gridDimensions.k,
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
        vertex_count=tot_num_vertices,
        poly_count=tot_num_polys,
    )

    LOGGER.debug(f"{myfunc} - Got polyline intersection in: {perf_metrics.to_string_s()}")

    return ret_obj
