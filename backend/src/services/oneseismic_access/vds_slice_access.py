import os
from typing import List
import requests
import logging

from requests_toolbelt.multipart.decoder import MultipartDecoder
import orjson as json
import numpy as np
from xtgeo import RegularSurface

from ..types.seismic_types import SeismicCubeVdsHandle
from src.services.utils.perf_timer import PerfTimer

VDS_HOST_ADDRESS = os.environ["VDS_HOST_ADDRESS"]

LOGGER = logging.getLogger(__name__)


class VdsSliceAccess:
    def __init__(self, sumo_seismic_vds_handle: SeismicCubeVdsHandle) -> requests.Response:
        self.sas: str = sumo_seismic_vds_handle.sas_token
        self.vds_url: str = sumo_seismic_vds_handle.vds_url

    def _query(self, endpoint: str, params: dict):
        params.update({"vds": self.vds_url, "sas": self.sas})
        response = requests.post(
            f"{VDS_HOST_ADDRESS}/{endpoint}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(params),
        )
        if not response.ok:
            raise RuntimeError(response.text)
        return response

    def get_slice(self, direction: str, lineno: int):
        pass

    def get_metadata(self):
        pass

    def get_fence(self, xs, ys, coordinate_system: str, interpolation="nearest"):
        pass

    def get_surface_values(
        self,
        xtgeo_surf: RegularSurface,
        above: float,
        below: float,
        attribute: str,
        interpolation: str = "nearest",
        fill_value: float = -999.25,
    ) -> np.ndarray:
        surface_values = xtgeo_surf.values.filled(fill_value)
        array_shape = surface_values.shape
        endpoint = "horizon"

        timer = PerfTimer()

        params = {
            "horizon": surface_values.tolist(),
            "xori": xtgeo_surf.xori,
            "yori": xtgeo_surf.yori,
            "xinc": xtgeo_surf.xinc,
            "yinc": xtgeo_surf.yinc,
            "rotation": xtgeo_surf.rotation,
            "fillValue": fill_value,
            "above": above,
            "below": below,
            "interpolation": interpolation,
            "attributes": [attribute],
        }
        response = self._query(endpoint, params)
        print(f"Got attribute surface from VDS in: {timer.elapsed_ms()}ms ({attribute})")
        parts = MultipartDecoder.from_response(response).parts
        seismic_values = np.ndarray(array_shape, "f4", parts[1].content)
        seismic_values = np.ma.masked_equal(seismic_values, fill_value)
        return seismic_values
