import logging
from typing import List, Optional

from pydantic import BaseModel
from fmu.sumo.explorer.explorer import SumoClient

from primary.services.service_exceptions import MultipleDataMatchesError, NoDataError, Service

from ._helpers import create_sumo_client
from .fmu_sumo_extensions.sumo_grid3d_geometry_class import Grid3dGeometry
from .fmu_sumo_extensions.sumo_grid3d_geometry_collection_class import Grid3dGeometryCollection
from .fmu_sumo_extensions.sumo_grid3d_property_collection_class import Grid3dPropertyCollection

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

    @classmethod
    async def from_case_uuid_async(cls, access_token: str, case_uuid: str, iteration_name: str) -> "Grid3dAccess":
        sumo_client: SumoClient = create_sumo_client(access_token)
        return Grid3dAccess(sumo_client=sumo_client, case_uuid=case_uuid, iteration_name=iteration_name)

    async def get_models_info_arr_async(self, realization: int) -> List[Grid3dInfo]:
        """Get metadata for all 3D grid models, including bbox, dimensions and properties"""
        grid_geometries_collection: Grid3dGeometryCollection = Grid3dGeometryCollection(
            sumo=self._sumo_client, case_uuid=self._case_uuid
        )

        filtered_grid_geometries_collection = grid_geometries_collection.filter(
            iteration=self._iteration_name,
            aggregation=False,
            realization=realization,
        )
        grid_geometry_names = await filtered_grid_geometries_collection.names_async
        if len(grid_geometry_names) == 0:
            raise NoDataError(
                f"No grid geometries found in case={self._case_uuid}, iteration={self._iteration_name}",
                Service.SUMO,
            )
        # Iterate through each grid geometry and get the bbox, spec and grid properties
        grid_model_meta_arr: List[Grid3dInfo] = []
        for grid_geometry_name in grid_geometry_names:
            grid_geometry_as_collection = grid_geometries_collection.filter(
                iteration=self._iteration_name,
                realization=realization,
                name=grid_geometry_name,
            )
            grid_geometry_name_as_arr = await grid_geometry_as_collection.names_async
            if len(grid_geometry_name_as_arr) > 1:
                raise MultipleDataMatchesError(
                    f"Multiple grid geometries found in case={self._case_uuid}, iteration={self._iteration_name}, grid_geometry_name={grid_geometry_name}",
                    Service.SUMO,
                )
            grid_geometry = await grid_geometry_as_collection.getitem_async(0)
            dimensions = get_dimensions_from_sumo_grid_obj(grid_geometry)
            bbox = get_bbox_from_sumo_grid_obj(grid_geometry)

            # Get the properties for the grid geometry
            grid_geometry_name = grid_geometry_name if grid_geometry_name != "Geogrid" else ""
            property_info_arr = await self.get_properties_info_arr_async(grid_geometry_name, realization)

            grid_model_meta_arr.append(
                Grid3dInfo(
                    grid_name=grid_geometry.name, bbox=bbox, dimensions=dimensions, property_info_arr=property_info_arr
                )
            )
        return grid_model_meta_arr

    async def get_properties_info_arr_async(
        self, grid3d_geometry_name: str, realization: int
    ) -> List[Grid3dPropertyInfo]:
        """Get metadata for grid properties belonging to a grid geometry"""

        grid3d_properties_collection: Grid3dPropertyCollection = Grid3dPropertyCollection(
            sumo=self._sumo_client, case_uuid=self._case_uuid, grid3d_geometry_name=grid3d_geometry_name
        )
        if "TROLL" in grid3d_geometry_name:
            query = grid3d_properties_collection._add_filter(
                name=grid3d_geometry_name, iteration=self._iteration_name, realization=realization
            )
            grid3d_properties_collection_filtered = Grid3dPropertyCollection(
                grid3d_geometry_name, self._sumo_client, self._case_uuid, query, None
            )
        else:
            grid3d_properties_collection_filtered = grid3d_properties_collection.filter(
                iteration=self._iteration_name, realization=realization
            )

        properties_meta: List[Grid3dPropertyInfo] = []
        async for property_meta in grid3d_properties_collection_filtered:
            iso_string_or_time_interval = None

            t_start = property_meta["data"].get("time", {}).get("t0", {}).get("value", None)
            t_end = property_meta["data"].get("time", {}).get("t1", {}).get("value", None)
            if t_start and not t_end:
                iso_string_or_time_interval = t_start
            if t_start and t_end:
                iso_string_or_time_interval = f"{t_start}/{t_end}"

            property_name = (
                property_meta["data"]["name"]
                if not "TROLL" in grid3d_geometry_name
                else property_meta["data"]["tagname"]
            )

            grid3d_property_meta = Grid3dPropertyInfo(
                property_name=property_name,
                iso_date_or_interval=iso_string_or_time_interval,
            )

            properties_meta.append(grid3d_property_meta)

        return properties_meta

    async def is_geometry_shared_async(self, grid3d_geometry_name: str) -> bool:
        """Check if a grid geometry is shared across all realizations"""
        grid_geometries_collection: Grid3dGeometryCollection = Grid3dGeometryCollection(
            sumo=self._sumo_client, case_uuid=self._case_uuid
        )
        grid_geometry_as_collection = grid_geometries_collection.filter(
            iteration=self._iteration_name,
            name=grid3d_geometry_name,
        )
        length_of_collection = await grid_geometry_as_collection.length_async()
        if length_of_collection == 0:
            raise NoDataError(
                f"No grid geometries found in case={self._case_uuid}, iteration={self._iteration_name}",
                Service.SUMO,
            )
        if length_of_collection == 1:
            return True

        first_grid_geometry = await grid_geometry_as_collection.getitem_async(0)
        bbox = get_bbox_from_sumo_grid_obj(first_grid_geometry)
        dimensions = get_dimensions_from_sumo_grid_obj(first_grid_geometry)

        for i in range(1, length_of_collection):
            grid_geometry = await grid_geometry_as_collection.getitem_async(i)
            if bbox != get_bbox_from_sumo_grid_obj(grid_geometry):
                return False
            if dimensions != get_dimensions_from_sumo_grid_obj(grid_geometry):
                return False

        return True


def get_dimensions_from_sumo_grid_obj(grid_obj: Grid3dGeometry) -> Grid3dDimensions:
    """Extract the spec from a Sumo GridGeometry object"""
    # Subgrids are stored as a dict in the spec as {name,layer_count}. How to preserve the order?
    subgrids = grid_obj.spec.get("subgrids", {})
    subgrid_list: List[Grid3dZone] = []
    start_layer_no = 1
    for subgrid_name, subgrid_layers in subgrids.items():
        subgrid_list.append(
            Grid3dZone(
                name=subgrid_name,
                start_layer=start_layer_no,
                end_layer=start_layer_no + subgrid_layers - 1,
            )
        )
        start_layer_no += subgrid_layers

    spec = Grid3dDimensions(
        i_count=grid_obj.spec.get("ncol", 0),
        j_count=grid_obj.spec.get("nrow", 0),
        k_count=grid_obj.spec.get("nlay", 0),
        subgrids=subgrid_list,
    )
    return spec


def get_bbox_from_sumo_grid_obj(grid_obj: Grid3dGeometry) -> Grid3dBoundingBox:
    """Extract the bbox from a Sumo GridGeometry object"""
    bbox = Grid3dBoundingBox(
        xmin=grid_obj.bbox["xmin"],
        ymin=grid_obj.bbox["ymin"],
        zmin=grid_obj.bbox["zmin"],
        xmax=grid_obj.bbox["xmax"],
        ymax=grid_obj.bbox["ymax"],
        zmax=grid_obj.bbox["zmax"],
    )
    return bbox
