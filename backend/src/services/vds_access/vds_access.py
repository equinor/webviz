import logging
import os
from typing import List

import numpy as np
import orjson as json
import requests
from requests_toolbelt.multipart.decoder import MultipartDecoder

from .types import VdsFenceResponse, VdsHandle, VdsMetaData, VdsSliceResponse

VDS_HOST_ADDRESS = os.getenv("WEBVIZ_VDS_HOST_ADDRESS")

LOGGER = logging.getLogger(__name__)


class VdsAccess:
    """Access to the service hosting vds-slice.
    https://github.com/equinor/vds-slice"""

    def __init__(self, sumo_seismic_vds_handle: VdsHandle) -> None:
        self.sas: str = sumo_seismic_vds_handle.sas_token
        self.vds_url: str = sumo_seismic_vds_handle.vds_url

    def _query(self, endpoint: str, params: dict) -> requests.Response:
        """Query the VDS service"""
        params.update({"vds": self.vds_url, "sas": self.sas})
        response = requests.post(
            f"{VDS_HOST_ADDRESS}/{endpoint}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(params),  # pylint: disable=maybe-no-member
            timeout=60,
        )

        if not response.ok:
            raise RuntimeError(f"({str(response.status_code)})-{response.reason}-{response.text} ")
        return response

    def get_slice(self, direction: str, lineno: int) -> VdsSliceResponse:
        """Gets a slice in i,j,k direction from the VDS service"""

        endpoint = "slice"
        params = {
            "direction": direction,
            "lineno": lineno,
            "vds": self.vds_url,
            "sas": self.sas,
        }
        response = self._query(endpoint, params)

        parts = MultipartDecoder.from_response(response).parts
        metadata = json.loads(parts[0].content)  # pylint: disable=maybe-no-member
        shape = (metadata["y"]["samples"], metadata["x"]["samples"])
        byte_array = parts[1].content
        values_np = bytes_to_ndarray(byte_array, list(shape), metadata["format"])
        values = values_np.tolist()
        return VdsSliceResponse(values=values, **metadata)

    def get_fence(self, coordinates: List[List[float]], coordinate_system: str = "cdp") -> VdsFenceResponse:
        """Gets traces along an arbitrary path of x,y coordinates."""
        endpoint = "fence"

        params = {
            "coordinateSystem": coordinate_system,
            "coordinates": coordinates,
            "vds": self.vds_url,
            "sas": self.sas,
            "interpolation": "linear",
            "fillValue": 10,
        }
        response = self._query(endpoint, params)

        parts = MultipartDecoder.from_response(response).parts
        metadata = json.loads(parts[0].content)  # pylint: disable=maybe-no-member
        byte_array = parts[1].content
        values_np = bytes_to_ndarray(byte_array, list(metadata["shape"]), metadata["format"])
        values = values_np.tolist()
        return VdsFenceResponse(values=values, shape=metadata["shape"])

    def get_metadata(self) -> VdsMetaData:
        """Gets metadata from the cube"""
        endpoint = "metadata"

        params = {
            "vds": self.vds_url,
            "sas": self.sas,
        }
        response = self._query(endpoint, params)
        if not response.ok:
            raise RuntimeError(response.text)
        metadata = response.json()
        return VdsMetaData(**metadata)

    # def get_surface_values(
    #     self,
    #     xtgeo_surf: RegularSurface,
    #     above: float,
    #     below: float,
    #     attribute: str,
    #     fill_value: float = -999.25,
    # ) -> np.ndarray:
    #     surface_values = xtgeo_surf.values.filled(fill_value)
    #     array_shape = surface_values.shape
    #     endpoint = "attributes/surface/along"

    #     timer = PerfTimer()

    #     params = {
    #         "surface": surface_values.tolist(),
    #         "above": above,
    #         "below": below,
    #         "attributes": [attribute],
    #     }
    #     response = self._query(endpoint, params)
    #     print(f"Got attribute surface from VDS in: {timer.elapsed_ms()}ms ({attribute})")
    #     parts = MultipartDecoder.from_response(response).parts
    #     seismic_values = np.ndarray(array_shape, "f4", parts[1].content)
    #     seismic_values = np.ma.masked_equal(seismic_values, fill_value)
    #     return seismic_values


def bytes_to_ndarray(bytes_data: bytes, shape: List[int], dtype: str) -> np.ndarray:
    """Convert bytes to numpy ndarray"""
    return np.ndarray(shape, dtype, bytes_data)
