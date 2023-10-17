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
    """Convert bytes to numpy ndarray"""
    return np.ndarray(shape, "<f4", bytes_data)


class VdsAccess:
    """Access to the service hosting vds-slice.
    https://github.com/equinor/vds-slice

    This access class is used to query the service for slices and fences of seismic data stored in Sumo in vds format.
    Note that we are not providing the service with the actual vds file, but rather a SAS token and an URL to the vds file.
    """

    def __init__(self, sumo_seismic_vds_handle: VdsHandle) -> None:
        self.sas: str = sumo_seismic_vds_handle.sas_token
        self.vds_url: str = sumo_seismic_vds_handle.vds_url

        self._interpolation = VdsInterpolation.LINEAR

    # async def _query(self, endpoint: str, request: VdsRequestedResource) -> httpx.Response:
    async def _query(endpoint: str, request: VdsRequestedResource) -> httpx.Response:
        """Query the service"""

        # request.sas = self.sas
        # request.vds = self.vds_url

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

    async def get_fence(
        self,
        coordinates: VdsCoordinates,
        coordinate_system: VdsCoordinateSystem = VdsCoordinateSystem.CDP
        # ) -> NDArray[np.float32]:
    ) -> np.ndarray:
        """
        Gets traces along an arbitrary path of (x, y) coordinates

        Returns:
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

        response = await self._query(endpoint, fence_request)

        # Use MultipartDecoder with httpx's Response content and headers
        decoder = MultipartDecoder(content=response.content, content_type=response.headers["Content-Type"])
        parts = decoder.parts

        # Validate parts from decoded response - metadata, data
        if len(parts) != 2 or not parts[0].content or not parts[1].content:
            raise ValueError(f"Expected two parts, got {len(parts)}")

        # Expect each part in parts tuple to be BodyPart
        if not isinstance(parts[0], BodyPart) or not isinstance(parts[1], BodyPart):
            raise ValueError(f"Expected parts to be BodyPart, got {type(parts[0])}, {type(parts[1])}")

        metadata = VdsFenceMetadata(**parts[0].content)
        byte_array = parts[1].content

        if metadata.format != "<f4":
            raise ValueError(f"Expected float32, got {metadata.format}")
        values_np = bytes_to_ndarray_float32(byte_array, metadata.shape)
        return values_np

    async def get_metadata(self) -> VdsMetadata:
        """Gets metadata from the cube"""
        endpoint = "metadata"

        metadata_request = VdsMetadataRequest(vds=self.vds_url, sas=self.sas)
        response = await self._query(endpoint, metadata_request)

        metadata = response.json()
        return VdsMetadata(**metadata)
