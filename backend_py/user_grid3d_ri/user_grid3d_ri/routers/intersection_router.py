import logging

import grpc
import numpy as np
from fastapi import APIRouter

from rips.generated import GridGeometryExtraction_pb2, GridGeometryExtraction_pb2_grpc
from rips.instance import *

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

    LOGGER.debug(f"post_get_polyline_intersection()")
    # LOGGER.debug(f"{req_body.sas_token=}")
    # LOGGER.debug(f"{req_body.blob_store_base_uri=}")
    # LOGGER.debug(f"{req_body.grid_blob_object_uuid=}")
    # LOGGER.debug(f"{req_body.property_blob_object_uuid=}")
    # LOGGER.debug(f"{len(req_body.polyline_utm_xy)=}")

    perf_metrics = PerfMetrics()

    blob_cache = LocalBlobCache(req_body.sas_token, req_body.blob_store_base_uri)

    grid_path_name = await blob_cache.ensure_grid_blob_downloaded_async(req_body.grid_blob_object_uuid)
    LOGGER.debug(f"{grid_path_name=}")
    property_path_name = await blob_cache.ensure_property_blob_downloaded_async(req_body.property_blob_object_uuid)
    LOGGER.debug(f"{property_path_name=}")
    perf_metrics.record_lap("get-blobs")

    grpc_channel: grpc.Channel = await RESINSIGHT_MANAGER.get_channel_for_running_ri_instance_async()
    perf_metrics.record_lap("get-ri")

    grid_geometry_extraction_stub = GridGeometryExtraction_pb2_grpc.GridGeometryExtractionStub(grpc_channel)
    grpc_request = GridGeometryExtraction_pb2.CutAlongPolylineRequest(
        gridFilename=grid_path_name,
        fencePolylineUtmXY=req_body.polyline_utm_xy,
    )

    grpc_response: GridGeometryExtraction_pb2.GetGridSurfaceResponse = grid_geometry_extraction_stub.CutAlongPolyline(
        grpc_request
    )

    perf_metrics.record_lap("ri-cut")

    LOGGER.debug(f"{len(grpc_response.fenceMeshSections)=}")

    ret_sections: list[api_schemas.FenceMeshSection] = []

    prop_extractor = GridPropertiesExtractor.from_roff_property_file(property_path_name)
    for fence_idx, grpc_section in enumerate(grpc_response.fenceMeshSections):
        LOGGER.debug(f"{len(grpc_section.vertexArrayUZ)=}")
        LOGGER.debug(f"{len(grpc_section.polyIndicesArr)=}")
        LOGGER.debug(f"{len(grpc_section.verticesPerPolygonArr)=}")
        # LOGGER.debug(f"{section.startUtmXY=}")
        # LOGGER.debug(f"{section.endUtmXY=}")

        # if fence_idx == 0:
        #     LOGGER.debug(f"----------------------------------------------------")
        #     LOGGER.debug(f"{grpc_section.polyIndicesArr=}")
        #     LOGGER.debug(f"{grpc_section.verticesPerPolygonArr=}")
        #     LOGGER.debug(f"----------------------------------------------------")

        num_polys = len(grpc_section.verticesPerPolygonArr)
        src_idx = 0
        dst_idx = 0
        polys_arr = np.empty(num_polys + len(grpc_section.polyIndicesArr), dtype=np.uint32)
        for num_verts_in_poly in grpc_section.verticesPerPolygonArr:
            polys_arr[dst_idx] = num_verts_in_poly
            dst_idx += 1
            for i in range(num_verts_in_poly):
                polys_arr[dst_idx + i] = grpc_section.polyIndicesArr[src_idx + i]

            src_idx += num_verts_in_poly
            dst_idx += num_verts_in_poly

        source_cell_indices = grpc_section.sourceCellIndicesArr
        LOGGER.debug(f"{len(source_cell_indices)=}")
        prop_vals = prop_extractor.get_prop_values_for_cells_forced_to_float_list(source_cell_indices)
        LOGGER.debug(f"{len(prop_vals)=}")

        section = api_schemas.FenceMeshSection(
            vertices_uz_arr=grpc_section.vertexArrayUZ,
            polys_arr=polys_arr,
            poly_source_cell_indices_arr=source_cell_indices,
            poly_props_arr=prop_vals,
            start_utm_x=grpc_section.startUtmXY.x,
            start_utm_y=grpc_section.startUtmXY.y,
            end_utm_x=grpc_section.endUtmXY.x,
            end_utm_y=grpc_section.endUtmXY.y,
        )
        ret_sections.append(section)

    perf_metrics.record_lap("process")

    ret_obj = api_schemas.PolylineIntersectionResponse(
        fence_mesh_sections=ret_sections,
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
    )

    LOGGER.debug(f"Got polyline intersection in: {perf_metrics.to_string_s()}")

    # with open("/home/appuser/polyline_intersection.json", "w") as f:
    #     f.write(ret_obj.model_dump_json())

    return ret_obj
