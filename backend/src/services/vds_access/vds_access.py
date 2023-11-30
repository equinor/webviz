import logging
from typing import List, Tuple
import json

import numpy as np
from numpy.typing import NDArray
from requests_toolbelt.multipart.decoder import MultipartDecoder, BodyPart
import httpx

from src import config

from .response_types import VdsMetadata, VdsFenceMetadata
from .request_types import (
    VdsCoordinates,
    VdsCoordinateSystem,
    VdsInterpolation,
    VdsFenceRequest,
    VdsRequestedResource,
    VdsMetadataRequest,
)


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

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{config.VDS_HOST_ADDRESS}/{endpoint}",
                headers={"Content-Type": "application/json"},
                content=json.dumps(request.request_parameters()),
                timeout=60,
            )

        if response.is_error:
            raise RuntimeError(f"({str(response.status_code)})-{response.reason_phrase}-{response.text}")

        return response

    async def get_metadata_async(self) -> VdsMetadata:
        """Gets metadata from the cube"""
        endpoint = "metadata"

        metadata_request = VdsMetadataRequest(vds=self.vds_url, sas=self.sas)
        response = await self._query_async(endpoint, metadata_request)

        metadata = response.json()
        return VdsMetadata(**metadata)

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

        # Use MultipartDecoder with httpx's Response content and headers
        decoder = MultipartDecoder(content=response.content, content_type=response.headers["Content-Type"])
        parts = decoder.parts

        # Validate parts from decoded response
        if len(parts) != 2 or not parts[0].content or not parts[1].content:
            raise ValueError(f"Expected two parts, got {len(parts)}")

        # Expect each part in parts tuple to be BodyPart
        if not isinstance(parts[0], BodyPart) or not isinstance(parts[1], BodyPart):
            raise ValueError(f"Expected parts to be BodyPart, got {type(parts[0])}, {type(parts[1])}")

        metadata = VdsFenceMetadata(**json.loads(parts[0].content))
        byte_array = parts[1].content

        if metadata.format != "<f4":
            raise ValueError(f"Expected float32, got {metadata.format}")

        if len(metadata.shape) != 2:
            raise ValueError(f"Expected shape to be 2D, got {metadata.shape}")

        # fence array data: [[t11, t12, ..., t1n], [t21, t22, ..., t2n], ..., [tm1, tm2, ..., tmn]]
        # m = num_traces, n = num_samples_per_trace
        num_traces = metadata.shape[0]
        num_samples_per_trace = metadata.shape[1]

        # Flattened array with row major order, i.e. C-order in numpy
        flattened_fence_traces_float32_array = bytes_to_flatten_ndarray_float32(byte_array, shape=metadata.shape)

        # Convert every value of `hard_coded_fill_value` to np.nan
        flattened_fence_traces_float32_array[flattened_fence_traces_float32_array == hard_coded_fill_value] = np.nan

        return (flattened_fence_traces_float32_array, num_traces, num_samples_per_trace)
