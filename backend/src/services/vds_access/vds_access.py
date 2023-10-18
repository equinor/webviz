import logging
import os
from typing import List
import json


import numpy as np
from numpy.typing import NDArray
from requests_toolbelt.multipart.decoder import MultipartDecoder, BodyPart
import httpx

from ..sumo_access.seismic_types import VdsHandle
from .response_types import VdsMetadata, VdsFenceMetadata
from .request_types import (
    VdsCoordinates,
    VdsCoordinateSystem,
    VdsInterpolation,
    VdsFenceRequest,
    VdsRequestedResource,
    VdsMetadataRequest,
)

VDS_HOST_ADDRESS = os.getenv("WEBVIZ_VDS_HOST_ADDRESS")

LOGGER = logging.getLogger(__name__)


def bytes_to_ndarray_float32(bytes_data: bytes, shape: List[int]) -> NDArray[np.float32]:
    """
    Convert bytes to numpy ndarray with specified shape and "C" order

    NOTE: Need for order in this function?

    """
    return np.ndarray(shape=shape, dtype="<f4", buffer=bytes_data, order="C")


class VdsAccess:
    """Access to the service hosting vds-slice.
    https://github.com/equinor/vds-slice

    This access class is used to query the service for slices and fences of seismic data stored in Sumo in vds format.
    Note that we are not providing the service with the actual vds file, but rather a SAS token and an URL to the vds file.
    """

    def __init__(self, sas_token: str, vds_url: str) -> None:
        self.sas: str = sas_token
        self.vds_url: str = vds_url

        self._interpolation = VdsInterpolation.LINEAR

    # async def _query(self, endpoint: str, request: VdsRequestedResource) -> httpx.Response:
    @staticmethod
    async def _query(endpoint: str, request: VdsRequestedResource) -> httpx.Response:
        """Query the service"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VDS_HOST_ADDRESS}/{endpoint}",
                headers={"Content-Type": "application/json"},
                content=json.dumps(request.request_parameters()),
                timeout=60,
            )

        if response.is_error:
            raise RuntimeError(f"({str(response.status_code)})-{response.reason_phrase}-{response.text}")

        return response

    # async def get_slice(self, direction: str, lineno: int) -> NDArray[np.float32]:
    #     """Gets a slice in i,j,k direction from the VDS service"""

    #     endpoint = "slice"
    #     params = {
    #         "direction": direction,
    #         "lineno": lineno,
    #         "vds": self.vds_url,
    #         "sas": self.sas,
    #     }
    #     response = await self._query(endpoint, params)

    #     # Use MultipartDecoder with httpx's Response content and headers
    #     decoder = MultipartDecoder(content=response.content, content_type=response.headers["Content-Type"])
    #     parts = decoder.parts

    #     metadata = json.loads(parts[0].content)
    #     shape = (metadata["y"]["samples"], metadata["x"]["samples"])
    #     if metadata["format"] != "<f4":
    #         raise ValueError(f"Expected float32, got {metadata['format']}")
    #     byte_array = parts[1].content
    #     values_np = bytes_to_ndarray_float32(byte_array, list(shape))
    #     return values_np

    async def get_fence_traces_as_ndarray(
        self, coordinates: VdsCoordinates, coordinate_system: VdsCoordinateSystem = VdsCoordinateSystem.CDP
    ) -> NDArray[np.float32]:
        """
        Gets traces along an arbitrary path of (x, y) coordinates.

        The traces are perpendicular on the on the coordinates in the x-y plane. The number of traces are
        equal to the number of (x, y) coordinates, and each trace has the same number of samples equal the
        depth of the seismic cube.

        TODO: Consider return ndarray with shape vs return 1D array with metadata?

        `Returns:`
        np.ndarray - with: dtype=float32, shape=[num_traces, num_trace_samples] and order='C'

        * num_traces = number of traces along the length of the fence, i.e. number of (x, y) coordinates
        * num_trace_samples = number of samples in each trace, i.e. number of values along the height/depth axis of the fence.
        """

        endpoint = "fence"
        hard_coded_fill_value = -999

        fence_request = VdsFenceRequest(
            vds=self.vds_url,
            sas=self.sas,
            coordinate_system=coordinate_system,
            coordinates=coordinates,
            interpolation=self._interpolation,
            fill_value=hard_coded_fill_value,
        )

        # Fence query returns two parts - metadata and data
        response = await self._query(endpoint, fence_request)

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

        return bytes_to_ndarray_float32(byte_array, shape=metadata.shape)

    async def get_metadata(self) -> VdsMetadata:
        """Gets metadata from the cube"""
        endpoint = "metadata"

        metadata_request = VdsMetadataRequest(vds=self.vds_url, sas=self.sas)
        response = await self._query(endpoint, metadata_request)

        metadata = response.json()
        return VdsMetadata(**metadata)
