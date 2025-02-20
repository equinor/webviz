import logging
from typing import List, Optional

from pydantic import BaseModel
from fmu.sumo.explorer.explorer import SumoClient, SearchContext

from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service
from webviz_pkg.core_utils.perf_metrics import PerfMetrics
from ._helpers import create_sumo_client


LOGGER = logging.getLogger(__name__)


class Grid3dBoundingBox(BaseModel):
    """Bounding box for a 3D grid geometry"""

    xmin: float
    ymin: float
    zmin: float
    xmax: float
    ymax: float
    zmax: float


class Grid3dZone(BaseModel):
    """Named subset of 3D grid layers (Zone)"""

    name: str
    start_layer: int
    end_layer: int


class Grid3dDimensions(BaseModel):
    """Specification of a 3D grid geometry"""

    i_count: int
    j_count: int
    k_count: int
    subgrids: List[Grid3dZone]


class Grid3dPropertyInfo(BaseModel):
    """Metadata for a 3D grid property"""

    property_name: str
    iso_date_or_interval: Optional[str] = None


class Grid3dInfo(BaseModel):
    """Metadata for a 3D grid model, including its properties and geometry"""

    grid_name: str
    bbox: Grid3dBoundingBox
    dimensions: Grid3dDimensions
    property_info_arr: List[Grid3dPropertyInfo]


class Grid3dAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, iteration_name: str):
        self._sumo_client: SumoClient = sumo_client
        self._case_uuid: str = case_uuid
        self._iteration_name: str = iteration_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, iteration=self._iteration_name
        )

    @classmethod
    def from_iteration_name(cls, access_token: str, case_uuid: str, iteration_name: str) -> "Grid3dAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_models_info_arr_async(self, realization: int) -> List[Grid3dInfo]:
        """Get metadata for all 3D grid models, including bbox, dimensions and properties"""

        grid3d_context = self._ensemble_context.grids.filter(realization=realization)

        grid_count = await grid3d_context.length_async()

        timer = PerfMetrics()
        grid3d_info_arr = []
        for grid_no in range(grid_count):

            grid3d_el = await grid3d_context.getitem_async(grid_no)
            grid_metadata = grid3d_el.metadata

            bbox = Grid3dBoundingBox(
                xmin=grid_metadata["data"]["bbox"]["xmin"],
                ymin=grid_metadata["data"]["bbox"]["ymin"],
                zmin=grid_metadata["data"]["bbox"]["zmin"],
                xmax=grid_metadata["data"]["bbox"]["xmax"],
                ymax=grid_metadata["data"]["bbox"]["ymax"],
                zmax=grid_metadata["data"]["bbox"]["zmax"],
            )
            timer.record_lap("get_bbox")
            if grid_metadata.get("data").get("spec").get("zonation"):
                subgrids = [
                    Grid3dZone(name=zone["name"], start_layer=zone["min_layer_idx"], end_layer=zone["max_layer_idx"])
                    for zone in grid_metadata["data"]["spec"]["zonation"]
                ]
            else:
                subgrids = []
            dimensions = Grid3dDimensions(
                i_count=grid_metadata["data"]["spec"]["nrow"],
                j_count=grid_metadata["data"]["spec"]["ncol"],
                k_count=grid_metadata["data"]["spec"]["nlay"],
                subgrids=subgrids,
            )
            timer.record_lap("get_dimensions")
            grid_properties_context = grid3d_el.grid_properties
            property_names = await grid_properties_context.names_async

            timer.record_lap("get_property_names")
            property_info_arr = []
            for property_name in property_names:
                property_info_arr.append(Grid3dPropertyInfo(property_name=property_name))
            timer.record_lap("get_property_info")
            grid3d_info = Grid3dInfo(
                grid_name=grid_metadata["data"]["name"],
                bbox=bbox,
                dimensions=dimensions,
                property_info_arr=property_info_arr,
            )
            timer.record_lap("create_grid3d_info")
            grid3d_info_arr.append(grid3d_info)
        LOGGER.debug(f"{timer.to_string()}, {self._case_uuid=}, {self._iteration_name=}")
        return grid3d_info_arr

    async def get_properties_info_arr_async(
        self, grid3d_geometry_name: str, realization: int
    ) -> List[Grid3dPropertyInfo]:
        """Get metadata for grid properties belonging to a grid geometry"""
        return []

    async def is_geometry_shared_async(self, grid3d_geometry_name: str) -> bool:
        """Check if a grid geometry is shared across all realizations"""

        return True

    async def get_geometry_blob_id_async(self, grid3d_geometry_name: str, realization: int) -> str:
        """Get the blob id of a grid geometry"""

        return ""

    async def get_property_blob_id_async(self, grid3d_geometry_name: str, property_name: str, realization: int) -> str:
        """Get the uuid of a grid property"""
        return ""


# async def get_grid_model_info_async(
#     access_token: str, case_uuid: str, iteration_name: str, realization_num: int
# ) -> List[Grid3dInfo]:
#     """Get metadata for all 3D grid models, including bbox, dimensions and properties"""
#     access = Grid3dAccess.from_iteration_name(access_token, case_uuid, iteration_name)
#     return await access.get_models_info_arr_async(realization_num)
