import logging
import os
from typing import List
import json

import numpy as np
from numpy.typing import NDArray
from requests_toolbelt.multipart.decoder import MultipartDecoder
import httpx

from ..sumo_access.seismic_types import VdsHandle
from .types import VdsMetaData

VDS_HOST_ADDRESS = os.getenv("WEBVIZ_VDS_HOST_ADDRESS")

LOGGER = logging.getLogger(__name__)


class VdsAccess:
    """Access to the service hosting vds-slice.
    https://github.com/equinor/vds-slice

    This access class is used to query the service for slices and fences of seismic data stored in Sumo in vds format.
    Note that we are not providing the service with the actual vds file, but rather a SAS token and an URL to the vds file.
    """

    def __init__(self, sumo_seismic_vds_handle: VdsHandle) -> None:
        self.sas: str = sumo_seismic_vds_handle.sas_token
        self.vds_url: str = sumo_seismic_vds_handle.vds_url

    async def _query(self, endpoint: str, params: dict) -> httpx.Response:
        """Query the service"""
        params.update({"url": self.vds_url, "sas": self.sas})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VDS_HOST_ADDRESS}/{endpoint}",
                headers={"Content-Type": "application/json"},
                content=json.dumps(params),
                timeout=60,
            )

        if response.is_error:
            raise RuntimeError(f"({str(response.status_code)})-{response.reason_phrase}-{response.text}")

        return response

    async def get_slice(self, direction: str, lineno: int) -> NDArray[np.float32]:
        """Gets a slice in i,j,k direction from the VDS service"""

        endpoint = "slice"
        params = {
            "direction": direction,
            "lineno": lineno,
            "vds": self.vds_url,
            "sas": self.sas,
        }
        response = await self._query(endpoint, params)

        # Use MultipartDecoder with httpx's Response content and headers
        decoder = MultipartDecoder(content=response.content, content_type=response.headers["Content-Type"])
        parts = decoder.parts

        metadata = json.loads(parts[0].content)
        shape = (metadata["y"]["samples"], metadata["x"]["samples"])
        if metadata["format"] != "<f4":
            raise ValueError(f"Expected float32, got {metadata['format']}")
        byte_array = parts[1].content
        values_np = bytes_to_ndarray_float22(byte_array, list(shape))
        return values_np

    async def get_fence(self, coordinates: List[List[float]], coordinate_system: str = "cdp") -> NDArray[np.float32]:
        """Gets traces along an arbitrary path of x,y coordinates."""
        endpoint = "fence"

        params = {
            "coordinateSystem": coordinate_system,
            "coordinates": coordinates,
            "vds": self.vds_url,
            "sas": self.sas,
            "interpolation": "linear",
            "fillValue": -999,
        }

        response = await self._query(endpoint, params)

        # Use MultipartDecoder with httpx's Response content and headers
        decoder = MultipartDecoder(content=response.content, content_type=response.headers["Content-Type"])
        parts = decoder.parts

        metadata = json.loads(parts[0].content)
        byte_array = parts[1].content
        if metadata["format"] != "<f4":
            raise ValueError(f"Expected float32, got {metadata['format']}")
        values_np = bytes_to_ndarray_float22(byte_array, list(metadata["shape"]))
        return values_np

    async def get_metadata(self) -> VdsMetaData:
        """Gets metadata from the cube"""
        endpoint = "metadata"

        params = {
            "vds": self.vds_url,
            "sas": self.sas,
        }
        response = await self._query(endpoint, params)
        metadata = response.json()
        return VdsMetaData(**metadata)


def bytes_to_ndarray_float22(bytes_data: bytes, shape: List[int]) -> NDArray[np.float32]:
    """Convert bytes to numpy ndarray"""
    return np.ndarray(shape, "<f4", bytes_data)
