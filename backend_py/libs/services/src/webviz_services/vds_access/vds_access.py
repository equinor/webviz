import logging
from typing import Dict, List, Tuple
import json

import numpy as np
from numpy.typing import NDArray
from requests_toolbelt.multipart.decoder import MultipartDecoder, BodyPart
import httpx

from webviz_services.service_exceptions import InvalidDataError, Service

from webviz_services.services_config import get_services_config
from webviz_services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER
from webviz_services.service_exceptions import ServiceRequestError

from .response_types import VdsArray, VdsAxis, VdsMetadata, VdsFenceMetadata, VdsSliceMetadata
from .request_types import (
    VdsCoordinates,
    VdsCoordinateSystem,
    VdsInterpolation,
    VdsFenceRequest,
    VdsRequestedResource,
    VdsMetadataRequest,
    VdsSliceRequest,
    VdsDirection,
)
from .bin_grid_transform import SeismicBinGridTransform

LOGGER = logging.getLogger(__name__)


def bytes_to_ndarray_float32(bytes_data: bytes, shape: List[int]) -> NDArray[np.float32]:
    """
    Convert bytes to numpy ndarray with row-major order, i.e. "C" order
    """
    return np.ndarray(shape=shape, dtype="<f4", buffer=bytes_data, order="C")


def bytes_to_flatten_ndarray_float32(bytes_data: bytes, shape: List[int]) -> NDArray[np.float32]:
    """
    Convert bytes to numpy flatten ndarray with row-major order, i.e. "C" order
    """
    return bytes_to_ndarray_float32(bytes_data, shape).flatten(order="C")


class VdsAccess:
    """Access to the service hosting vds-slice.
    https://github.com/equinor/vds-slice

    This access class is used to query the service for slices and fences of seismic data stored in Sumo in vds format.
    Note that we are not providing the service with the actual vds file, but rather a SAS token and an URL to the vds file.
    """

    def __init__(
        self, sas_token: str, vds_url: str, interpolation_method: VdsInterpolation = VdsInterpolation.LINEAR
    ) -> None:
        self.sas = sas_token
        self.vds_url = vds_url
        self._interpolation = interpolation_method

    @staticmethod
    async def _query_async(endpoint: str, request: VdsRequestedResource) -> httpx.Response:
        """Query the service"""
        services_config = get_services_config()
        try:
            response = await HTTPX_ASYNC_CLIENT_WRAPPER.client.post(
                f"{services_config.vds_host_address}/{endpoint}",
                headers={"Content-Type": "application/json"},
                content=json.dumps(request.request_parameters()),
                timeout=60,
            )

            if response.is_error:
                raise ServiceRequestError(
                    f"({str(response.status_code)})-{response.reason_phrase}-{response.text}", service=Service.VDS
                )

        except httpx.RequestError as error:
            raise ServiceRequestError(f"{error}", service=Service.VDS) from error

        return response

    async def get_metadata_async(self) -> VdsMetadata:
        """Gets metadata from the cube"""
        endpoint = "metadata"

        metadata_request = VdsMetadataRequest(vds=self.vds_url, sas=self.sas)
        response = await self._query_async(endpoint, metadata_request)

        metadata = response.json()
        return VdsMetadata(**metadata)

    async def get_inline_slice_async(self, line_no: int) -> Tuple[NDArray[np.float32], VdsSliceMetadata]:
        endpoint = "slice"
        slice_request = VdsSliceRequest(
            vds=self.vds_url,
            sas=self.sas,
            direction=VdsDirection.INLINE,
            line_no=line_no,
        )
        response = await self._query_async(endpoint, slice_request)

        parts = self._extract_and_validate_body_parts_from_response(response)
        response_metadata = json.loads(parts[0].content)
        metadata = VdsSliceMetadata(
            format=response_metadata["format"],
            shape=response_metadata["shape"],
            x_axis=VdsAxis(**response_metadata["x"]),
            y_axis=VdsAxis(**response_metadata["y"]),
            geospatial=response_metadata["geospatial"],
        )
        self._assert_valid_metadata_format_and_shape(metadata)

        byte_array = parts[1].content

        # Flattened array with row major order, i.e. C-order in numpy
        flattened_fence_traces_float32_array = bytes_to_flatten_ndarray_float32(byte_array, shape=metadata.shape)

        return (flattened_fence_traces_float32_array, metadata)

    async def get_crossline_slice_async(self, line_no: int) -> Tuple[NDArray[np.float32], VdsSliceMetadata]:
        endpoint = "slice"
        slice_request = VdsSliceRequest(
            vds=self.vds_url,
            sas=self.sas,
            direction=VdsDirection.CROSSLINE,
            line_no=line_no,
        )
        response = await self._query_async(endpoint, slice_request)

        parts = self._extract_and_validate_body_parts_from_response(response)

        response_metadata = json.loads(parts[0].content)
        metadata = VdsSliceMetadata(
            format=response_metadata["format"],
            shape=response_metadata["shape"],
            x_axis=VdsAxis(**response_metadata["x"]),
            y_axis=VdsAxis(**response_metadata["y"]),
            geospatial=response_metadata["geospatial"],
        )
        self._assert_valid_metadata_format_and_shape(metadata)

        byte_array = parts[1].content

        # Flattened array with row major order, i.e. C-order in numpy
        flattened_fence_traces_float32_array = bytes_to_flatten_ndarray_float32(byte_array, shape=metadata.shape)

        return (flattened_fence_traces_float32_array, metadata)

    async def get_depth_slice_async(self, depth_slice_no: int) -> Tuple[NDArray[np.float32], VdsSliceMetadata]:
        endpoint = "slice"
        slice_request = VdsSliceRequest(
            vds=self.vds_url,
            sas=self.sas,
            direction=VdsDirection.DEPTH,
            line_no=depth_slice_no,
        )
        response = await self._query_async(endpoint, slice_request)

        parts = self._extract_and_validate_body_parts_from_response(response)

        response_metadata = json.loads(parts[0].content)
        metadata = VdsSliceMetadata(
            format=response_metadata["format"],
            shape=response_metadata["shape"],
            x_axis=VdsAxis(**response_metadata["x"]),
            y_axis=VdsAxis(**response_metadata["y"]),
            geospatial=response_metadata["geospatial"],
        )
        self._assert_valid_metadata_format_and_shape(metadata)

        byte_array = parts[1].content

        # Flattened array with row major order, i.e. C-order in numpy
        flattened_fence_traces_float32_array = bytes_to_flatten_ndarray_float32(byte_array, shape=metadata.shape)

        return (flattened_fence_traces_float32_array, metadata)

    async def get_flattened_fence_traces_array_and_metadata_async(
        self, coordinates: VdsCoordinates, coordinate_system: VdsCoordinateSystem = VdsCoordinateSystem.CDP
    ) -> Tuple[NDArray[np.float32], int, int]:
        """
        Gets traces along an arbitrary path of (x, y) coordinates, with a trace per coordinate.

        The traces are perpendicular on the on the coordinates in the x-y plane, and each trace has number
        of samples equal to the depth of the seismic cube.

        With traces perpendicular to the x-y plane, the traces are defined to go along the depth direction
        of the fence.

        Invalid values, e.g. values for points outside of the seismic cube, are set to np.nan.

        `Returns:`
        `Tuple[flattened_fence_traces_array: NDArray[np.float32], num_traces: int, num_samples_per_trace: int]`

        `flattened_fence_traces_array`: 1D np.ndarray with dtype=float32, stored trace by trace. The array has length `num_traces x num_samples_per_trace`.\n
        `num_traces`: number of traces along the length of the fence, i.e. number of (x, y) coordinates.\n
        `num_samples_per_trace`: number of samples in each trace, i.e. number of values along the height/depth axis of the fence.\n


        \n`Description:`

        With `m = num_traces`, and `n = num_samples_per_trace`, the flattened array has length `mxn`.

        `2D Fence Trace Array from VDS-slice query:`

        ```
        [[t11, t12, ..., t1n],
        [t21, t22, ..., t2n],
                ...          ,
        [tm1, tm2, ..., tmn]]
        ```

        \n`Returned flattened 2D trace array with row major order:`

        ```
        [t11, t12, ..., t1n, t21, t22, ..., t2n, ..., tm1, tm2, ..., tmn]
        ```

        \n`Visualization Example:`

        ```
        trace_1  trace_2     trace_m
        |--------|--- ... ---| sample_1
        |--------|--- ... ---| sample_2
                     .
                     .
                     .
        |--------|--- ... ---| sample_n-1
        |--------|--- ... ---| sample_n
        ```
        """

        endpoint = "fence"

        # Temporary hard coded fill value for points outside of the seismic cube.
        # If no fill value is provided in the request is rejected with error if list of coordinates
        # contain points outside of the seismic cube.
        hard_coded_fill_value = -999.25

        fence_request = VdsFenceRequest(
            vds=self.vds_url,
            sas=self.sas,
            coordinate_system=coordinate_system,
            coordinates=coordinates,
            interpolation=self._interpolation,
            fill_value=hard_coded_fill_value,
        )

        # Fence query returns two parts - metadata and data
        response = await self._query_async(endpoint, fence_request)

        parts = self._extract_and_validate_body_parts_from_response(response)

        metadata = VdsFenceMetadata(**json.loads(parts[0].content))
        self._assert_valid_metadata_format_and_shape(metadata)

        byte_array = parts[1].content

        # fence array data: [[t11, t12, ..., t1n], [t21, t22, ..., t2n], ..., [tm1, tm2, ..., tmn]]
        # m = num_traces, n = num_samples_per_trace
        num_traces = metadata.shape[0]
        num_samples_per_trace = metadata.shape[1]

        # Flattened array with row major order, i.e. C-order in numpy
        flattened_fence_traces_float32_array = bytes_to_flatten_ndarray_float32(byte_array, shape=metadata.shape)

        # Convert every value of `hard_coded_fill_value` to np.nan
        flattened_fence_traces_float32_array[flattened_fence_traces_float32_array == hard_coded_fill_value] = np.nan
        return (flattened_fence_traces_float32_array, num_traces, num_samples_per_trace)

    async def get_nearest_real_trace_fence_data_async(
        self, coordinates: VdsCoordinates, bin_grid_transform: SeismicBinGridTransform
    ) -> Tuple[NDArray[np.float32], List[float], List[float], List[int], List[int]]:
        """
        For each (x, y) point in `coordinates`, look up the nearest real trace in the cube's bin grid
        (via `bin_grid_transform`) and fetch its exact, non-interpolated sample values.

        Unlike `get_flattened_fence_traces_array_and_metadata_async`, no trace here is synthesized by
        interpolating between neighboring traces - each returned trace is an actual trace of the cube.
        Several input coordinates may therefore resolve to (and return) the same real trace.

        `Returns:`
        `Tuple[flattened_fence_traces_array, trace_x_points, trace_y_points, trace_inline, trace_crossline]`

        The returned lists align 1:1 with `coordinates`, i.e. have the same length/num_traces as the input.
        `trace_x_points`/`trace_y_points` are the UTM position of the real trace actually used for each input
        coordinate, which may differ slightly from the originally requested (x, y) point. `trace_inline`/
        `trace_crossline` are that same trace's inline/crossline line numbers.
        """
        nearest_ij_per_point = [
            bin_grid_transform.utm_xy_to_nearest_ij(x, y)
            for x, y in zip(coordinates.x_points, coordinates.y_points)
        ]

        unique_ij_list: List[Tuple[int, int]] = []
        unique_index_by_ij: Dict[Tuple[int, int], int] = {}
        point_index_to_unique_index: List[int] = []
        for ij in nearest_ij_per_point:
            if ij not in unique_index_by_ij:
                unique_index_by_ij[ij] = len(unique_ij_list)
                unique_ij_list.append(ij)
            point_index_to_unique_index.append(unique_index_by_ij[ij])

        unique_coordinates = VdsCoordinates(
            x_points=[float(i) for i, _ in unique_ij_list],
            y_points=[float(j) for _, j in unique_ij_list],
        )

        (
            unique_traces_flat_array,
            num_unique_traces,
            num_samples_per_trace,
        ) = await self.get_flattened_fence_traces_array_and_metadata_async(
            coordinates=unique_coordinates, coordinate_system=VdsCoordinateSystem.IJ
        )

        unique_traces_2d = unique_traces_flat_array.reshape(num_unique_traces, num_samples_per_trace)
        broadcast_traces_2d = unique_traces_2d[point_index_to_unique_index]

        trace_x_points: List[float] = []
        trace_y_points: List[float] = []
        trace_inline: List[int] = []
        trace_crossline: List[int] = []
        for i, j in nearest_ij_per_point:
            x, y = bin_grid_transform.ij_to_utm_xy(i, j)
            inline, crossline = bin_grid_transform.ij_to_inline_crossline(i, j)
            trace_x_points.append(x)
            trace_y_points.append(y)
            trace_inline.append(inline)
            trace_crossline.append(crossline)

        return (broadcast_traces_2d.flatten(order="C"), trace_x_points, trace_y_points, trace_inline, trace_crossline)

    def _extract_and_validate_body_parts_from_response(self, response: httpx.Response) -> Tuple[BodyPart, BodyPart]:
        """Extract parts from response's body and validate them"""

        # Use MultipartDecoder with httpx's Response content and headers
        decoder = MultipartDecoder(content=response.content, content_type=response.headers["Content-Type"])
        parts = decoder.parts

        # Validate parts from decoded response
        if len(parts) != 2 or not parts[0].content or not parts[1].content:
            raise InvalidDataError(f"Expected two parts in multipart response, got {len(parts)}", service=Service.VDS)

        # Expect each part in parts tuple to be BodyPart
        if not isinstance(parts[0], BodyPart) or not isinstance(parts[1], BodyPart):
            raise InvalidDataError(
                f"Expected parts in multipart response to be of type 'BodyPart', got {type(parts[0])}, {type(parts[1])}",
                service=Service.VDS,
            )

        return parts

    def _assert_valid_metadata_format_and_shape(self, metadata: VdsArray) -> None:
        if metadata.format != "<f4":
            raise InvalidDataError(f"Expected float32, got {metadata.format}", service=Service.VDS)

        if len(metadata.shape) != 2:
            raise InvalidDataError(f"Expected shape to be 2D, got {metadata.shape}", service=Service.VDS)
