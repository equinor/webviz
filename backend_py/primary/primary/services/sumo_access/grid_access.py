import logging
from io import BytesIO
from typing import List

import xtgeo

from webviz_pkg.core_utils.perf_timer import PerfTimer

from ._helpers import SumoEnsemble
from .queries.cpgrid import (
    get_grid_geometry_blob_id,
    get_grid_names,
    get_grid_parameter_blob_id,
    get_nx_ny_nz_for_ensemble_grids,
    get_static_grid_parameter_names,
)

LOGGER = logging.getLogger(__name__)


class GridAccess(SumoEnsemble):
    async def grid_model_names(self) -> List[str]:
        """Get a list of grid model names"""
        return await get_grid_names(self._sumo_client, self._case_uuid, self._iteration_name)

    async def static_parameter_names(self, grid_name: str) -> List[str]:
        """Get a list of grid parameter names"""
        return await get_static_grid_parameter_names(
            self._sumo_client, self._case_uuid, self._iteration_name, grid_name
        )

    async def get_grid_geometry(self, grid_name: str, realization: int) -> xtgeo.Grid:
        timer = PerfTimer()
        geometry_blob_id = await get_grid_geometry_blob_id(
            self._sumo_client,
            self._case_uuid,
            self._iteration_name,
            realization,
            grid_name,
        )
        stream = self._sumo_client.get(f"/objects('{geometry_blob_id}')/blob")
        print(f"{grid_name} {realization} {geometry_blob_id} in {round(timer.lap_s(),2)}s")
        grid_geom = xtgeo.grid_from_file(BytesIO(stream.content))

        return grid_geom

    async def get_grid_parameter(
        self, grid_name: str, grid_parameter_name: str, realization: int
    ) -> xtgeo.GridProperty:
        timer = PerfTimer()
        parameter_blob_id = await get_grid_parameter_blob_id(
            self._sumo_client,
            self._case_uuid,
            self._iteration_name,
            realization,
            grid_name,
            grid_parameter_name,
        )
        stream = self._sumo_client.get(f"/objects('{parameter_blob_id}')/blob")
        print(f"{grid_name} {grid_parameter_name} {realization} {parameter_blob_id} in {round(timer.lap_s(),2)}s")
        grid_param = xtgeo.gridproperty_from_file(BytesIO(stream.content))
        return grid_param

    async def grids_have_equal_nxnynz(self, grid_name: str) -> bool:
        """Check nx ny nz equality for all realizations of a grid model in a case and iteration"""
        nx_ny_nz_arr = await get_nx_ny_nz_for_ensemble_grids(
            self._sumo_client, self._case_uuid, self._iteration_name, grid_name
        )
        return all(nx_ny_nz_arr[0] == nx_ny_nz_arr[i] for i in range(1, len(nx_ny_nz_arr)))
