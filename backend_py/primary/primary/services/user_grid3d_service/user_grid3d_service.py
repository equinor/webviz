import logging
from typing import Literal, Sequence

import httpx
import numpy as np
from numpy.typing import NDArray
from pydantic import BaseModel
from sumo.wrapper import SumoClient

from webviz_pkg.core_utils.b64 import B64FloatArray, B64IntArray, B64UintArray
from webviz_pkg.core_utils.b64 import b64_decode_float_array_to_list, b64_decode_int_array
from webviz_pkg.core_utils.b64 import b64_encode_float_array_as_float32
from webviz_pkg.core_utils.perf_metrics import PerfMetrics, make_metrics_string_s
from webviz_pkg.server_schemas.user_grid3d_ri import api_schemas as server_api_schemas

from primary import config
from primary.auth.auth_helper import AuthenticatedUser
from primary.services.service_exceptions import Service
from primary.services.service_exceptions import ServiceRequestError, ServiceTimeoutError, ServiceUnavailableError
from primary.services.sumo_access.queries.grid3d import get_grid_geometry_and_property_blob_ids_async
from primary.services.sumo_access.queries.grid3d import get_grid_geometry_blob_id_async
from primary.services.sumo_access.sumo_blob_access import get_sas_token_and_blob_store_base_uri_for_case
from primary.services.user_session_manager.user_session_manager import UserComponent, UserSessionManager

LOGGER = logging.getLogger(__name__)


class IJKIndexFilter(BaseModel):
    min_i: int
    max_i: int
    min_j: int
    max_j: int
    min_k: int
    max_k: int


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


class GridGeometry(BaseModel):
    vertices_b64arr: B64FloatArray
    polys_b64arr: B64UintArray
    poly_source_cell_indices_b64arr: B64UintArray
    origin_utm_x: float
    origin_utm_y: float
    grid_dimensions: GridDimensions
    bounding_box: BoundingBox3D


class MappedGridProperties(BaseModel):
    poly_props_b64arr: B64FloatArray | B64IntArray
    undefined_int_value: int | None
    min_grid_prop_value: float | int
    max_grid_prop_value: float | int


class FenceMeshSection(BaseModel):
    # U-axis defined by unit length vector from start to end, Z is global Z
    vertices_uz_b64arr: B64FloatArray
    poly_indices_b64arr: B64UintArray
    vertices_per_poly_b64arr: B64UintArray
    poly_source_cell_indices_b64arr: B64UintArray
    poly_props_b64arr: B64FloatArray
    start_utm_x: float
    start_utm_y: float
    end_utm_x: float
    end_utm_y: float


class PolylineIntersection(BaseModel):
    fence_mesh_sections: list[FenceMeshSection]
    grid_dimensions: GridDimensions
    min_grid_prop_value: float
    max_grid_prop_value: float


class UserGrid3dService:
    def __init__(
        self, session_base_url: str, sumo_client: SumoClient, case_uuid: str, sas_token: str, blob_store_base_uri: str
    ) -> None:
        self._base_url = session_base_url
        self._sumo_client = sumo_client
        self._case_uuid = case_uuid
        self._sas_token = sas_token
        self._blob_store_base_uri = blob_store_base_uri
        self._call_timeout = 60
        self._include_inactive_cells = False

    @classmethod
    async def create_async(cls, authenticated_user: AuthenticatedUser, case_uuid: str) -> "UserGrid3dService":
        perf_metrics = PerfMetrics()

        session_manager = UserSessionManager(authenticated_user.get_user_id(), authenticated_user.get_username())
        session_base_url = await session_manager.get_or_create_session_async(UserComponent.GRID3D_RI, None)
        if session_base_url is None:
            raise ServiceUnavailableError("Failed to get user session URL", Service.USER_SESSION)
        perf_metrics.record_lap("get-session")

        sumo_access_token = authenticated_user.get_sumo_access_token()
        sumo_client = SumoClient(env=config.SUMO_ENV, token=sumo_access_token, interactive=False)
        perf_metrics.record_lap("sumo-client")

        sas_token, blob_store_base_uri = get_sas_token_and_blob_store_base_uri_for_case(sumo_access_token, case_uuid)
        perf_metrics.record_lap("sas-token")

        service_object = UserGrid3dService(
            session_base_url=session_base_url,
            sumo_client=sumo_client,
            case_uuid=case_uuid,
            sas_token=sas_token,
            blob_store_base_uri=blob_store_base_uri,
        )

        LOGGER.debug(f".create_async() took: {perf_metrics.to_string_s()}")

        return service_object

    async def get_grid_geometry_async(
        self, ensemble_name: str, realization: int, grid_name: str, ijk_index_filter: IJKIndexFilter | None
    ) -> GridGeometry:
        perf_metrics = PerfMetrics()

        grid_blob_object_uuid = await get_grid_geometry_blob_id_async(
            self._sumo_client, self._case_uuid, ensemble_name, realization, grid_name
        )
        LOGGER.debug(f".get_grid_geometry_async() - {grid_blob_object_uuid=}")
        perf_metrics.record_lap("blob-id")

        effective_ijk_index_filter: server_api_schemas.IJKIndexFilter | None = None
        if ijk_index_filter:
            effective_ijk_index_filter = server_api_schemas.IJKIndexFilter.model_validate(ijk_index_filter.model_dump())

        request_body = server_api_schemas.GridGeometryRequest(
            sas_token=self._sas_token,
            blob_store_base_uri=self._blob_store_base_uri,
            grid_blob_object_uuid=grid_blob_object_uuid,
            include_inactive_cells=self._include_inactive_cells,
            ijk_index_filter=effective_ijk_index_filter,
        )

        perf_metrics.reset_lap_timer()
        response = await self._call_service_endpoint_post(
            endpoint="get_grid_geometry",
            body_pydantic_model=request_body,
            operation_descr="getting grid geometry from grid3d user session",
        )
        perf_metrics.record_lap("call-user-session")

        api_obj = server_api_schemas.GridGeometryResponse.model_validate_json(response.content)
        perf_metrics.record_lap("parse-response")

        ret_obj = GridGeometry(
            vertices_b64arr=api_obj.vertices_b64arr,
            polys_b64arr=api_obj.polys_b64arr,
            poly_source_cell_indices_b64arr=api_obj.poly_source_cell_indices_b64arr,
            origin_utm_x=api_obj.origin_utm_x,
            origin_utm_y=api_obj.origin_utm_y,
            grid_dimensions=GridDimensions.model_validate(api_obj.grid_dimensions.model_dump()),
            bounding_box=BoundingBox3D.model_validate(api_obj.bounding_box.model_dump()),
        )
        perf_metrics.record_lap("convert")

        self._log_grid_and_poly_info(".get_grid_geometry_async()", api_obj.grid_dimensions, api_obj.stats)
        self._log_perf_messages(".get_grid_geometry_async()", perf_metrics, api_obj.stats)

        return ret_obj

    async def get_mapped_grid_properties_async(
        self,
        ensemble_name: str,
        realization: int,
        grid_name: str,
        property_name: str,
        property_time_or_interval_str: str | None,
        ijk_index_filter: IJKIndexFilter | None,
    ) -> MappedGridProperties:
        perf_metrics = PerfMetrics()

        grid_blob_object_uuid, property_blob_object_uuid = await get_grid_geometry_and_property_blob_ids_async(
            self._sumo_client,
            self._case_uuid,
            ensemble_name,
            realization,
            grid_name,
            property_name,
            property_time_or_interval_str,
        )
        LOGGER.debug(f".get_mapped_grid_properties_async() - {grid_blob_object_uuid=}")
        LOGGER.debug(f".get_mapped_grid_properties_async() - {property_blob_object_uuid=}")
        perf_metrics.record_lap("blob-ids")

        effective_ijk_index_filter: server_api_schemas.IJKIndexFilter | None = None
        if ijk_index_filter:
            effective_ijk_index_filter = server_api_schemas.IJKIndexFilter.model_validate(ijk_index_filter.model_dump())

        request_body = server_api_schemas.MappedGridPropertiesRequest(
            sas_token=self._sas_token,
            blob_store_base_uri=self._blob_store_base_uri,
            grid_blob_object_uuid=grid_blob_object_uuid,
            property_blob_object_uuid=property_blob_object_uuid,
            include_inactive_cells=self._include_inactive_cells,
            ijk_index_filter=effective_ijk_index_filter,
        )

        perf_metrics.reset_lap_timer()
        response = await self._call_service_endpoint_post(
            endpoint="get_mapped_grid_properties",
            body_pydantic_model=request_body,
            operation_descr="getting mapped grid properties from grid3d user session",
        )
        perf_metrics.record_lap("call-user-session")

        api_obj = server_api_schemas.MappedGridPropertiesResponse.model_validate_json(response.content)
        perf_metrics.record_lap("parse-response")

        ret_obj = MappedGridProperties(
            poly_props_b64arr=api_obj.poly_props_b64arr,
            undefined_int_value=api_obj.undefined_int_value,
            max_grid_prop_value=api_obj.max_grid_prop_value,
            min_grid_prop_value=api_obj.min_grid_prop_value,
        )
        perf_metrics.record_lap("convert")

        self._log_grid_and_poly_info(".get_mapped_grid_properties_async()", None, api_obj.stats)
        self._log_perf_messages(".get_mapped_grid_properties_async()", perf_metrics, api_obj.stats)

        return ret_obj

    async def get_polyline_intersection_async(
        self,
        ensemble_name: str,
        realization: int,
        grid_name: str,
        property_name: str,
        property_time_or_interval_str: str | None,
        polyline_utm_xy: list[float],
    ) -> PolylineIntersection:
        perf_metrics = PerfMetrics()

        grid_blob_object_uuid, property_blob_object_uuid = await get_grid_geometry_and_property_blob_ids_async(
            self._sumo_client,
            self._case_uuid,
            ensemble_name,
            realization,
            grid_name,
            property_name,
            property_time_or_interval_str,
        )
        LOGGER.debug(f".get_polyline_intersection_async() - {grid_blob_object_uuid=}")
        LOGGER.debug(f".get_polyline_intersection_async() - {property_blob_object_uuid=}")
        perf_metrics.record_lap("blob-ids")

        request_body = server_api_schemas.PolylineIntersectionRequest(
            sas_token=self._sas_token,
            blob_store_base_uri=self._blob_store_base_uri,
            grid_blob_object_uuid=grid_blob_object_uuid,
            property_blob_object_uuid=property_blob_object_uuid,
            include_inactive_cells=self._include_inactive_cells,
            polyline_utm_xy=polyline_utm_xy,
        )

        response = await self._call_service_endpoint_post(
            endpoint="get_polyline_intersection",
            body_pydantic_model=request_body,
            operation_descr="getting polyline intersection from grid3d user session",
        )
        perf_metrics.record_lap("call-user-session")

        api_obj = server_api_schemas.PolylineIntersectionResponse.model_validate_json(response.content)
        perf_metrics.record_lap("validate-response")

        # Not sure how we should be doing this wrt performance.
        # Right now we end up doing one validation here and another when creating the return object.
        ret_mesh_section_list: list[FenceMeshSection] = []
        for api_sect in api_obj.fence_mesh_sections:
            if isinstance(api_sect.poly_props_b64arr, B64FloatArray):
                poly_props_float_list = b64_decode_float_array_to_list(api_sect.poly_props_b64arr)
            else:
                poly_props_float_list = b64_decode_int_array(api_sect.poly_props_b64arr).astype(float).tolist()

            sect = FenceMeshSection(
                vertices_uz_b64arr=api_sect.vertices_uz_b64arr,
                poly_indices_b64arr=api_sect.poly_indices_b64arr,
                vertices_per_poly_b64arr=api_sect.vertices_per_poly_b64arr,
                poly_source_cell_indices_b64arr=api_sect.poly_source_cell_indices_b64arr,
                poly_props_b64arr=b64_encode_float_array_as_float32(poly_props_float_list),
                start_utm_x=api_sect.start_utm_x,
                start_utm_y=api_sect.start_utm_y,
                end_utm_x=api_sect.end_utm_x,
                end_utm_y=api_sect.end_utm_y,
            )
            ret_mesh_section_list.append(sect)

        ret_obj = PolylineIntersection(
            fence_mesh_sections=ret_mesh_section_list,
            grid_dimensions=GridDimensions.model_validate(api_obj.grid_dimensions.model_dump()),
            min_grid_prop_value=api_obj.min_grid_prop_value,
            max_grid_prop_value=api_obj.max_grid_prop_value,
        )
        perf_metrics.record_lap("convert")

        self._log_grid_and_poly_info(".get_polyline_intersection_async()", api_obj.grid_dimensions, api_obj.stats)
        self._log_perf_messages(".get_polyline_intersection_async()", perf_metrics, api_obj.stats)

        return ret_obj

    def _log_perf_messages(self, prefix: str, metrics: PerfMetrics, stats: server_api_schemas.Stats | None) -> None:
        user_session_details = "na"
        resinsight_details = "na"
        if stats and stats.perf_metrics:
            user_session_details = make_metrics_string_s(stats.perf_metrics, stats.total_time)
        if stats and stats.ri_perf_metrics:
            resinsight_details = make_metrics_string_s(stats.ri_perf_metrics, stats.ri_total_time)

        LOGGER.debug(f"{prefix} took: {metrics.to_string_s()}")
        LOGGER.debug(f"{prefix}   - user sess.: {user_session_details}")
        LOGGER.debug(f"{prefix}   - resinsight: {resinsight_details}")

    def _log_grid_and_poly_info(
        self, prefix: str, grid_dims: server_api_schemas.GridDimensions | None, stats: server_api_schemas.Stats | None
    ) -> None:
        if grid_dims:
            cell_count = grid_dims.i_count * grid_dims.j_count * grid_dims.k_count
            msg = f"gridSize: {grid_dims.i_count}x{grid_dims.j_count}x{grid_dims.k_count}, cellCount: {cell_count}"
        else:
            msg = "gridSize: na"

        if stats:
            msg += f", polyCount: {stats.poly_count}, vertexCount: {stats.vertex_count}"

        LOGGER.debug(f"{prefix} {msg}")

    async def _call_service_endpoint_get(
        self, endpoint: str, query_params: dict[str, str], operation_descr: str
    ) -> httpx.Response:
        return await self._make_request_to_service_endpoint(
            method="GET",
            endpoint=endpoint,
            query_params=query_params,
            post_body_pydantic_model=None,
            operation_descr=operation_descr,
        )

    async def _call_service_endpoint_post(
        self, endpoint: str, body_pydantic_model: BaseModel, operation_descr: str
    ) -> httpx.Response:
        return await self._make_request_to_service_endpoint(
            method="POST",
            endpoint=endpoint,
            query_params=None,
            post_body_pydantic_model=body_pydantic_model,
            operation_descr=operation_descr,
        )

    async def _make_request_to_service_endpoint(
        self,
        method: Literal["GET", "POST"],
        endpoint: str,
        query_params: dict[str, str] | None,
        post_body_pydantic_model: BaseModel | None,
        operation_descr: str,
    ) -> httpx.Response:

        url = f"{self._base_url}/{endpoint}"
        LOGGER.debug(f"._make_request_to_service_endpoint() - {method=}, {endpoint=}, {url=}")

        post_content: str | None = None
        if method == "POST" and post_body_pydantic_model is not None:
            post_content = post_body_pydantic_model.model_dump_json()

        async with httpx.AsyncClient(timeout=self._call_timeout) as client:
            try:
                response: httpx.Response = await client.request(
                    method=method, url=url, params=query_params, content=post_content
                )
                response.raise_for_status()

            except httpx.TimeoutException as e:
                LOGGER.error(
                    f"Error calling '{endpoint}' endpoint, request timed out for {method} to {url=}"
                    f"\n  exception: {e}"
                )
                raise ServiceTimeoutError(f"Timeout {operation_descr}", Service.USER_SESSION) from e

            except httpx.RequestError as e:
                LOGGER.error(
                    f"Error calling '{endpoint}' endpoint, request error occurred for {method} to {url=}"
                    f"\n  exception: {e}"
                )
                raise ServiceRequestError(f"Error {operation_descr}", Service.USER_SESSION) from e

            except httpx.HTTPStatusError as e:
                LOGGER.error(
                    f"Error calling '{endpoint}' endpoint, HTTP error {e.response.status_code} for {method} to {url=}"
                    f"\n  response: {e.response.text}"
                    f"\n  exception: {e}"
                )
                raise ServiceRequestError(f"Error {operation_descr}", Service.USER_SESSION) from e

        LOGGER.debug(f"._make_request_to_service_endpoint() succeeded - {method=}, {endpoint=}, {url=}")

        return response


def _build_vtk_style_polys(
    poly_indices_arr_np: Sequence[int], vertices_per_poly_arr_np: Sequence[int]
) -> NDArray[np.uint32]:
    num_polys = len(vertices_per_poly_arr_np)
    polys_arr = np.empty(num_polys + len(poly_indices_arr_np), dtype=np.uint32)

    src_idx = 0
    dst_idx = 0
    for num_verts_in_poly in vertices_per_poly_arr_np:
        polys_arr[dst_idx] = num_verts_in_poly
        dst_idx += 1
        polys_arr[dst_idx : dst_idx + num_verts_in_poly] = poly_indices_arr_np[src_idx : src_idx + num_verts_in_poly]
        src_idx += num_verts_in_poly
        dst_idx += num_verts_in_poly

    return polys_arr
