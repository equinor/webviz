import logging
from typing import Literal

import httpx
from pydantic import BaseModel

from sumo.wrapper import SumoClient
from webviz_pkg.core_utils.perf_timer import PerfTimer
from webviz_pkg.core_utils.b64 import B64FloatArray, B64UintArray
from webviz_pkg.server_schemas.user_grid3d_ri import api_schemas as server_api_schemas

from primary.auth.auth_helper import AuthenticatedUser
from primary.services.user_session_manager.user_session_manager import UserSessionManager, UserComponent
from primary.services.service_exceptions import Service, ServiceUnavailableError, ServiceTimeoutError, ServiceRequestError

# Dirty imports!!
from primary.services.sumo_access._helpers import create_sumo_client_instance
from primary.services.sumo_access.queries.cpgrid import get_grid_geometry_blob_id
from primary.services.sumo_access.queries.cpgrid import get_grid_parameter_blob_id
from primary.services.surface_query_service.surface_query_service import _get_sas_token_and_blob_store_base_uri_for_case

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


class GridGeometry(BaseModel):
    vertices_b64arr: B64FloatArray
    polys_b64arr: B64UintArray
    poly_source_cell_indices_b64arr: B64UintArray
    bounding_box: BoundingBox3D


class MappedGridProperties(BaseModel):
    poly_props_b64arr: B64FloatArray
    # min_value: float
    # max_value: float


class UserGrid3dService:
    def __init__(
        self, session_base_url: str, sumo_client: SumoClient, case_uuid: str, sas_token: str, blob_store_base_uri: str
    ) -> None:
        self._base_url = session_base_url
        self._sumo_client = sumo_client
        self._case_uuid = case_uuid
        self._sas_token = sas_token
        self._blob_store_base_uri = blob_store_base_uri
        self._call_timeout = 30

    @classmethod
    async def create_async(cls, authenticated_user: AuthenticatedUser, case_uuid: str) -> "UserGrid3dService":
        timer = PerfTimer()

        session_manager = UserSessionManager(authenticated_user.get_user_id())
        session_base_url = await session_manager.get_or_create_session_async(UserComponent.GRID3D_RI, None)
        if session_base_url is None:
            raise ServiceUnavailableError("Failed to get user session URL", Service.USER_SESSION)
        et_user_session_s = timer.lap_s()

        sumo_access_token = authenticated_user.get_sumo_access_token()
        sumo_client = create_sumo_client_instance(sumo_access_token)
        et_sumo_client_s = timer.lap_s()

        sas_token, blob_store_base_uri = _get_sas_token_and_blob_store_base_uri_for_case(sumo_access_token, case_uuid)
        LOGGER.debug(f"{sas_token=}")
        LOGGER.debug(f"{blob_store_base_uri=}")
        et_sas_token_s = timer.lap_s()

        service_object = UserGrid3dService(
            session_base_url=session_base_url,
            sumo_client=sumo_client,
            case_uuid=case_uuid,
            sas_token=sas_token,
            blob_store_base_uri=blob_store_base_uri,
        )

        LOGGER.debug(
            f"UserGrid3dService.create_async() took: {timer.elapsed_s():.2f}s [{et_user_session_s=:.2f}s, {et_sumo_client_s=:.2f}s, {et_sas_token_s=:.2f}s]"
        )

        return service_object

    async def get_grid_geometry_async(
        self, ensemble_name: str, realization: int, grid_name: str, ijk_index_filter: IJKIndexFilter | None
    ) -> GridGeometry:
        timer = PerfTimer()

        grid_blob_object_uuid = await get_grid_geometry_blob_id(
            self._sumo_client, self._case_uuid, ensemble_name, realization, grid_name
        )
        LOGGER.debug(f"{grid_blob_object_uuid=}")
        et_blob_id_s = timer.lap_s()

        effective_ijk_index_filter: server_api_schemas.IJKIndexFilter | None = None
        if ijk_index_filter:
            effective_ijk_index_filter = server_api_schemas.IJKIndexFilter.model_validate(ijk_index_filter.model_dump())

        request_body = server_api_schemas.GridGeometryRequest(
            sas_token=self._sas_token,
            blob_store_base_uri=self._blob_store_base_uri,
            grid_blob_object_uuid=grid_blob_object_uuid,
            ijk_index_filter=effective_ijk_index_filter,
        )

        response = await self._call_service_endpoint_post(
            endpoint="get_grid_geometry",
            body_pydantic_model=request_body,
            operation_descr="getting grid geometry from grid3d user session",
        )
        et_call_user_session_s = timer.lap_s()

        server_obj = server_api_schemas.GridGeometryResponse.model_validate_json(response.content)

        # bb1 = BoundingBox3D(min_x=0, min_y=1, min_z=2, max_x=3, max_y=4, max_z=5)
        # bb = BoundingBox3D.model_validate(bb1)
        # bb = BoundingBox3D(**server_obj.bounding_box)

        ret_obj = GridGeometry(
            vertices_b64arr=server_obj.vertices_b64arr,
            polys_b64arr=server_obj.polys_b64arr,
            poly_source_cell_indices_b64arr=server_obj.poly_source_cell_indices_b64arr,
            bounding_box=BoundingBox3D.model_validate(server_obj.bounding_box.model_dump()),
        )

        LOGGER.debug(
            f"UserGrid3dService.get_grid_geometry_async() took {timer.elapsed_s():.2f}s [{et_blob_id_s=:.2f}s, {et_call_user_session_s=:.2f}s]"
        )

        return ret_obj

    async def get_mapped_grid_properties_async(
        self,
        ensemble_name: str,
        realization: int,
        grid_name: str,
        property_name: str,
        ijk_index_filter: IJKIndexFilter | None,
    ) -> MappedGridProperties:
        timer = PerfTimer()

        grid_blob_object_uuid = await get_grid_geometry_blob_id(
            self._sumo_client, self._case_uuid, ensemble_name, realization, grid_name
        )
        LOGGER.debug(f"{grid_blob_object_uuid=}")

        property_blob_object_uuid = await get_grid_parameter_blob_id(
            self._sumo_client, self._case_uuid, ensemble_name, realization, grid_name, property_name
        )
        LOGGER.debug(f"{property_blob_object_uuid=}")

        et_blob_ids_s = timer.lap_s()

        effective_ijk_index_filter: server_api_schemas.IJKIndexFilter | None = None
        if ijk_index_filter:
            effective_ijk_index_filter = server_api_schemas.IJKIndexFilter.model_validate(ijk_index_filter.model_dump())

        request_body = server_api_schemas.MappedGridPropertiesRequest(
            sas_token=self._sas_token,
            blob_store_base_uri=self._blob_store_base_uri,
            grid_blob_object_uuid=grid_blob_object_uuid,
            property_blob_object_uuid=property_blob_object_uuid,
            ijk_index_filter=effective_ijk_index_filter,
        )
        response = await self._call_service_endpoint_post(
            endpoint="get_mapped_grid_properties",
            body_pydantic_model=request_body,
            operation_descr="getting mapped grid properties from grid3d user session",
        )
        et_call_user_session_s = timer.lap_s()

        server_obj = server_api_schemas.MappedGridPropertiesResponse.model_validate_json(response.content)

        ret_obj = MappedGridProperties(poly_props_b64arr=server_obj.poly_props_b64arr)

        LOGGER.debug(
            f"UserGrid3dService.get_mapped_grid_properties_async() took {timer.elapsed_s():.2f}s [{et_blob_ids_s=:.2f}s, {et_call_user_session_s=:.2f}s]"
        )

        return ret_obj

    async def get_polyline_intersection_async(
        self, ensemble_name: str, realization: int, grid_name: str, property_name: str, polyline_utm_xy: list[float]
    ) -> None:
        timer = PerfTimer()

        grid_blob_object_uuid = await get_grid_geometry_blob_id(
            self._sumo_client, self._case_uuid, ensemble_name, realization, grid_name
        )
        LOGGER.debug(f"{grid_blob_object_uuid=}")

        property_blob_object_uuid = await get_grid_parameter_blob_id(
            self._sumo_client, self._case_uuid, ensemble_name, realization, grid_name, property_name
        )
        LOGGER.debug(f"{property_blob_object_uuid=}")

        et_blob_ids_s = timer.lap_s()

        request_body = server_api_schemas.PolylineIntersectionRequest(
            sas_token=self._sas_token,
            blob_store_base_uri=self._blob_store_base_uri,
            grid_blob_object_uuid=grid_blob_object_uuid,
            property_blob_object_uuid=property_blob_object_uuid,
            polyline_utm_xy=polyline_utm_xy,
        )

        response = await self._call_service_endpoint_post(
            endpoint="get_polyline_intersection",
            body_pydantic_model=request_body,
            operation_descr="getting polyline intersection from grid3d user session",
        )
        et_call_user_session_s = timer.lap_s()

        LOGGER.debug(
            f"UserGrid3dService.get_polyline_intersection_async() took {timer.elapsed_s():.2f}s [{et_blob_ids_s=:.2f}s, {et_call_user_session_s=:.2f}s]"
        )

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
        LOGGER.debug(f"_make_request_to_service_endpoint() - {method=}, {endpoint=}, {url=}")

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

        LOGGER.debug(f"_make_request_to_service_endpoint() succeeded - {method=}, {endpoint=}, {url=}")

        return response
