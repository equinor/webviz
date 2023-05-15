import logging
from io import BytesIO
from typing import List, Optional

import xtgeo
from fmu.sumo.explorer.objects import Case
from sumo.wrapper import SumoClient

from src.services.utils.perf_timer import PerfTimer

from ._helpers import create_sumo_client_instance
from .sumo_queries import (get_grid_geometry_blob_id, get_grid_names,
                           get_grid_parameter_blob_id,
                           get_nx_ny_nz_for_ensemble_grids,
                           get_static_grid_parameter_names)

LOGGER = logging.getLogger(__name__)


class GridAccess:
    def __init__(self, access_token: str, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = create_sumo_client_instance(access_token)
        self._case_uuid = case_uuid
        self._iteration_name = iteration_name.strip("iter-")  # ...
        self._sumo_case_obj: Optional[Case] = None

    def grid_model_names(self) -> List[str]:
        """Get a list of grid model names"""
        return get_grid_names(self._sumo_client, self._case_uuid, self._iteration_name)

    def static_parameter_names(self, grid_name: str) -> List[str]:
        """Get a list of grid parameter names"""
        return get_static_grid_parameter_names(
            self._sumo_client, self._case_uuid, self._iteration_name, grid_name
        )

    def get_grid_geometry(self, grid_name: str, realization: int) -> xtgeo.Grid:
        timer = PerfTimer()
        geometry_blob_id = get_grid_geometry_blob_id(
            self._sumo_client,
            self._case_uuid,
            self._iteration_name,
            realization,
            grid_name,
        )
        stream = self._sumo_client.get(f"/objects('{geometry_blob_id}')/blob")
        print(
            f"{grid_name} {realization} {geometry_blob_id} in {round(timer.lap_s(),2)}s"
        )
        grid_geom = xtgeo.grid_from_file(BytesIO(stream))

        return grid_geom

    def get_grid_parameter(
        self, grid_name: str, grid_parameter_name: str, realization: int
    ) -> xtgeo.GridProperty:
        timer = PerfTimer()
        parameter_blob_id = get_grid_parameter_blob_id(
            self._sumo_client,
            self._case_uuid,
            self._iteration_name,
            realization,
            grid_name,
            grid_parameter_name,
        )
        stream = self._sumo_client.get(f"/objects('{parameter_blob_id}')/blob")
        print(
            f"{grid_name} {grid_parameter_name} {realization} {parameter_blob_id} in {round(timer.lap_s(),2)}s"
        )
        grid_param = xtgeo.gridproperty_from_file(BytesIO(stream))
        return grid_param

    def grids_have_equal_nxnynz(self, grid_name: str) -> bool:
        """Check nx ny nz equality for all realizations of a grid model in a case and iteration"""
        nx_ny_nz_arr = get_nx_ny_nz_for_ensemble_grids(
            self._sumo_client, self._case_uuid, self._iteration_name, grid_name
        )
        return all(
            nx_ny_nz_arr[0] == nx_ny_nz_arr[i] for i in range(1, len(nx_ny_nz_arr))
        )
