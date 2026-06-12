import logging
from typing import List, Optional
import asyncio

from pydantic import BaseModel
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from fmu.sumo.explorer.objects import CPGrid

from webviz_core_utils.timestamp_utils import iso_str_to_date_str, timestamp_utc_ms_to_iso_str
from webviz_services.service_exceptions import InvalidDataError, Service
from .sumo_client_factory import create_sumo_client

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
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "Grid3dAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_models_info_arr_async(self, realization: int) -> List[Grid3dInfo]:
        """Get metadata for all 3D grid models, including bbox, dimensions and properties"""

        grid3d_search_context = self._ensemble_context.grids.filter(realization=realization)

        # Run loop in parallel as function for creating meta is async
        sumo_grid_uuids: list[str] = await grid3d_search_context.uuids_async
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(_get_grid_model_meta_async(grid3d_search_context, uuid)) for uuid in sumo_grid_uuids
            ]
        grid_meta_arr: list[Grid3dInfo] = [task.result() for task in tasks]

        return grid_meta_arr


async def _get_grid_model_meta_async(sumo_grid3d_search_context: SearchContext, grid_uuid: str) -> Grid3dInfo:
    """
    Get grid object from SUMO using grid search context and grid uuid, and create metadata for the grid model.

    This is a helper function for Grid3dAccess.get_models_info_arr_async

    Note that in fmu-sumo the grid properties metadata are related to a grid geometry via data.geometry.relative_path.keyword
    Older metadata using e.g. name or tagname for the grid geometry relationship are not supported.
    """
    # Get the grid object from the search context
    sumo_grid_object = await sumo_grid3d_search_context.get_object_async(grid_uuid)
    if not isinstance(sumo_grid_object, CPGrid):
        raise InvalidDataError(f"Did not get expected CPGrid object type for {grid_uuid=}", Service.SUMO)

    grid_metadata = sumo_grid_object.metadata

    bbox = Grid3dBoundingBox(
        xmin=grid_metadata["data"]["bbox"]["xmin"],
        ymin=grid_metadata["data"]["bbox"]["ymin"],
        zmin=grid_metadata["data"]["bbox"]["zmin"],
        xmax=grid_metadata["data"]["bbox"]["xmax"],
        ymax=grid_metadata["data"]["bbox"]["ymax"],
        zmax=grid_metadata["data"]["bbox"]["zmax"],
    )
    if grid_metadata.get("data").get("spec").get("zonation"):
        subgrids = [
            Grid3dZone(name=zone["name"], start_layer=zone["min_layer_idx"], end_layer=zone["max_layer_idx"])
            for zone in grid_metadata["data"]["spec"]["zonation"]
        ]
    else:
        subgrids = []

    dimensions = Grid3dDimensions(
        i_count=grid_metadata["data"]["spec"]["ncol"],
        j_count=grid_metadata["data"]["spec"]["nrow"],
        k_count=grid_metadata["data"]["spec"]["nlay"],
        subgrids=subgrids,
    )
    property_info_arr = await _get_grid_properties_info_async(sumo_grid_object)
    grid3d_info = Grid3dInfo(
        grid_name=grid_metadata["data"]["name"],
        bbox=bbox,
        dimensions=dimensions,
        property_info_arr=property_info_arr,
    )

    return grid3d_info


async def _get_grid_properties_info_async(cpgrid: CPGrid) -> List[Grid3dPropertyInfo]:
    """
    Get grid properties metadata for a given CPGrid object.
    This is a helper function to extract property metadata from a CPGrid instance.

    The valid timestamps/intervals are resolved per property using composite aggregations, so that
    each property only reports the time points/intervals that actually exist for that property.
    """

    no_time_context = cpgrid.grid_properties.filter(time=TimeFilter(time_type=TimeType.NONE))
    timestamp_context = cpgrid.grid_properties.filter(time=TimeFilter(time_type=TimeType.TIMESTAMP))
    interval_context = cpgrid.grid_properties.filter(time=TimeFilter(time_type=TimeType.INTERVAL))

    async with asyncio.TaskGroup() as tg:
        no_time_property_names_task = tg.create_task(no_time_context.names_async)
        timestamp_buckets_task = tg.create_task(
            timestamp_context.get_composite_agg_async({"name": "data.name.keyword", "t0": "data.time.t0.value"})
        )
        interval_buckets_task = tg.create_task(
            interval_context.get_composite_agg_async(
                {"name": "data.name.keyword", "t0": "data.time.t0.value", "t1": "data.time.t1.value"}
            )
        )

    no_time_property_names = no_time_property_names_task.result()
    timestamp_buckets = timestamp_buckets_task.result()
    interval_buckets = interval_buckets_task.result()

    property_info_arr: List[Grid3dPropertyInfo] = []

    for property_name in no_time_property_names:
        property_info_arr.append(Grid3dPropertyInfo(property_name=property_name, iso_date_or_interval=None))

    # Each bucket is a unique (property name, timestamp) combination that actually exists in Sumo.
    # The time field values are returned as epoch milliseconds by the composite aggregation.
    for bucket in timestamp_buckets:
        property_info_arr.append(
            Grid3dPropertyInfo(
                property_name=bucket["name"],
                iso_date_or_interval=iso_str_to_date_str(timestamp_utc_ms_to_iso_str(bucket["t0"])),
            )
        )

    # Each bucket is a unique (property name, interval) combination that actually exists in Sumo.
    for bucket in interval_buckets:
        start_date = iso_str_to_date_str(timestamp_utc_ms_to_iso_str(bucket["t0"]))
        end_date = iso_str_to_date_str(timestamp_utc_ms_to_iso_str(bucket["t1"]))
        property_info_arr.append(
            Grid3dPropertyInfo(
                property_name=bucket["name"],
                iso_date_or_interval=f"{start_date}/{end_date}",
            )
        )

    return property_info_arr
