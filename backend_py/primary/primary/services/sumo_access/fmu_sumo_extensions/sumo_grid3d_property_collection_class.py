"""Module containing class for collection of 3D grid properties"""

from typing import Union, List, Dict, Tuple
from sumo.wrapper import SumoClient
from fmu.sumo.explorer.objects._child_collection import ChildCollection
from .sumo_grid3d_property_class import Grid3dProperty
from fmu.sumo.explorer.timefilter import TimeFilter
from fmu.sumo.explorer.pit import Pit

TIMESTAMP_QUERY = {
    "bool": {
        "must": [{"exists": {"field": "data.time.t0"}}],
        "must_not": [{"exists": {"field": "data.time.t1"}}],
    }
}


class Grid3dPropertyCollection(ChildCollection):
    """Class representing a collection of property objects belonging to a 3D grid geometry in Sumo"""

    def __init__(
        self,
        grid3d_geometry_name: str,
        sumo: SumoClient,
        case_uuid: str,
        query: Dict | None = None,
        pit: Pit | None = None,
    ):
        """
        Args:
            sumo (SumoClient): connection to Sumo
            grid3d_geometry_name: name of the parent grid geometry
            case_uuid (str): parent case uuid
            query (dict): elastic query object
            pit (Pit): point in time
        """

        self._grid3d_geometry_name = grid3d_geometry_name
        super().__init__("cpgrid_property", sumo, case_uuid, query, pit)

        # self._aggregation_cache = {}

    def __getitem__(self, index: int) -> Grid3dProperty:
        doc = super().__getitem__(index)
        return Grid3dProperty(self._sumo, doc)

    async def getitem_async(self, index: int) -> Grid3dProperty:
        doc = await super().getitem_async(index)
        return Grid3dProperty(self._sumo, doc)

    @property
    def timestamps(self) -> List[str]:
        """List of unique timestamps in Grid3dPropertyCollection"""
        return self._get_field_values("data.time.t0.value", TIMESTAMP_QUERY, True)

    @property
    async def timestamps_async(self) -> List[str]:
        """List of unique timestamps in Grid3dPropertyCollection"""
        return await self._get_field_values_async("data.time.t0.value", TIMESTAMP_QUERY, True)

    @property
    def intervals(self) -> List[Tuple]:
        """List of unique intervals in Grid3dPropertyCollection"""
        res = self._sumo.post(
            "/search",
            json={
                "query": self._query,
                "aggs": {
                    "t0": {
                        "terms": {"field": "data.time.t0.value", "size": 50},
                        "aggs": {
                            "t1": {
                                "terms": {
                                    "field": "data.time.t1.value",
                                    "size": 50,
                                }
                            }
                        },
                    }
                },
            },
        )

        buckets = res.json()["aggregations"]["t0"]["buckets"]
        intervals: List[Tuple] = []

        for bucket in buckets:
            t0 = bucket["key_as_string"]

            for t1 in bucket["t1"]["buckets"]:
                intervals.append((t0, t1["key_as_string"]))

        return intervals

    @property
    async def intervals_async(self) -> List[Tuple]:
        """List of unique intervals in Grid3dPropertyCollection"""
        res = await self._sumo.post_async(
            "/search",
            json={
                "query": self._query,
                "aggs": {
                    "t0": {
                        "terms": {"field": "data.time.t0.value", "size": 50},
                        "aggs": {
                            "t1": {
                                "terms": {
                                    "field": "data.time.t1.value",
                                    "size": 50,
                                }
                            }
                        },
                    }
                },
            },
        )

        buckets = res.json()["aggregations"]["t0"]["buckets"]
        intervals: List[Tuple] = []

        for bucket in buckets:
            t0 = bucket["key_as_string"]

            for t1 in bucket["t1"]["buckets"]:
                intervals.append((t0, t1["key_as_string"]))

        return intervals

    def filter(
        self,
        name: Union[str, List[str], bool, None] = None,
        vertical_domain: Union[str, List[str], bool, None] = None,
        iteration: Union[str, List[str], bool, None] = None,
        realization: Union[int, List[int], bool, None] = None,
        aggregation: Union[str, List[str], bool, None] = None,
        stage: Union[str, List[str], bool, None] = None,
        time: TimeFilter | None = None,
        uuid: Union[str, List[str], bool, None] = None,
        is_observation: bool | None = None,
        is_prediction: bool | None = None,
    ) -> "Grid3dPropertyCollection":
        """Filter grid properties

        Apply filters to the Grid3dPropertyCollection and get a new filtered instance.

        Args:
            name (Union[str, List[str], bool]): grid property name
            iteration (Union[int, List[int], bool]): iteration id
            realization Union[int, List[int], bool]: realization id
            aggregation (Union[str, List[str], bool]): aggregation operation
            stage (Union[str, List[str], bool]): context/stage
            time (TimeFilter): time filter
            uuid (Union[str, List[str], bool]): grid property object uuid
            vertical_domain (Union[str, List[str], bool]): grid property vertical_domain

        Returns:
            Grid3dPropertyCollection: A filtered Grid3dPropertyCollection

        """

        query = super()._add_filter(
            name=name,
            tagname=self._grid3d_geometry_name,
            iteration=iteration,
            realization=realization,
            aggregation=aggregation,
            stage=stage,
            time=time,
            uuid=uuid,
            vertical_domain=vertical_domain,
            is_observation=is_observation,
            is_prediction=is_prediction,
        )

        return Grid3dPropertyCollection(self._grid3d_geometry_name, self._sumo, self._case_uuid, query, self._pit)
