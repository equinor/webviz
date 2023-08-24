import os
from typing import List
import logging

import requests
from requests_toolbelt.multipart.decoder import MultipartDecoder
import orjson as json
import numpy as np
from xtgeo import RegularSurface

from src.services.utils.perf_timer import PerfTimer
from .vds_types import VdsHandle


VDS_HOST_ADDRESS = os.environ["VDS_HOST_ADDRESS"]

LOGGER = logging.getLogger(__name__)


class VdsAccess:
    def __init__(self, sumo_seismic_vds_handle: VdsHandle) -> requests.Response:
        self.sas: str = sumo_seismic_vds_handle.sas_token
        self.vds_url: str = sumo_seismic_vds_handle.vds_url

    def _query(self, endpoint: str, params: dict):
        params.update({"vds": self.vds_url, "sas": self.sas})
        response = requests.post(
            f"{VDS_HOST_ADDRESS}/{endpoint}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(params),  # pylint: disable=maybe-no-member
            timeout=60,
        )

        if not response.ok:
            raise RuntimeError(f" ({ str(response.status_code)})-{response.reason}-{response.content}-{response.text} ")
        return response

    def get_slice(self, direction: str, lineno: int):
        endpoint = "slice"
        params = {
            "direction": direction,
            "lineno": lineno,
            "vds": self.vds_url,
            "sas": self.sas,
        }
        response = self._query(endpoint, params)

        # print(f"Got slice from VDS in: {timer.elapsed_ms()}ms ({attribute})")
        parts = MultipartDecoder.from_response(response).parts
        meta = json.loads(parts[0].content)  # pylint: disable=maybe-no-member
        shape = (meta["y"]["samples"], meta["x"]["samples"])

        seismic_values = np.ndarray(shape, "f4", parts[1].content)

        return seismic_values, meta

    def get_fence(self, coordinates: List[List[float]], coordinate_system: str):
        endpoint = "fence"

        params = {
            "coordinateSystem": coordinate_system,
            "coordinates": coordinates,
            "vds": self.vds_url,
            "sas": self.sas,
            "interpolation": "linear",
            "fillValue": -999.25,
        }
        response = self._query(endpoint, params)

        # print(f"Got slice from VDS in: {timer.elapsed_ms()}ms ({attribute})")
        multipart_data = MultipartDecoder.from_response(response)

        metadata = json.loads(multipart_data.parts[0].content)  # pylint: disable=maybe-no-member
        data = multipart_data.parts[1].content

        data = np.ndarray(metadata["shape"], metadata["format"], data)
        return data, metadata

    def get_metadata(self):
        endpoint = "metadata"

        params = {
            "vds": self.vds_url,
            "sas": self.sas,
        }
        response = self._query(endpoint, params)
        if not response.ok:
            raise RuntimeError(response.text)
        return response.json()

    def get_surface_values(
        self,
        xtgeo_surf: RegularSurface,
        above: float,
        below: float,
        attribute: str,
        fill_value: float = -999.25,
    ) -> np.ndarray:
        surface_values = xtgeo_surf.values.filled(fill_value)
        array_shape = surface_values.shape
        endpoint = "attributes/surface/along"

        timer = PerfTimer()

        params = {
            "surface": surface_values.tolist(),
            "above": above,
            "below": below,
            "attributes": [attribute],
        }
        response = self._query(endpoint, params)
        print(f"Got attribute surface from VDS in: {timer.elapsed_ms()}ms ({attribute})")
        parts = MultipartDecoder.from_response(response).parts
        seismic_values = np.ndarray(array_shape, "f4", parts[1].content)
        seismic_values = np.ma.masked_equal(seismic_values, fill_value)
        return seismic_values
