"""Module containing class for collection of 3D grid geometries"""

from typing import Union, List, Dict
from sumo.wrapper import SumoClient
from fmu.sumo.explorer.objects._child_collection import ChildCollection
from .sumo_grid3d_geometry_class import Grid3dGeometry
from fmu.sumo.explorer.pit import Pit

TIMESTAMP_QUERY = {
    "bool": {
        "must": [{"exists": {"field": "data.time.t0"}}],
        "must_not": [{"exists": {"field": "data.time.t1"}}],
    }
}


class Grid3dGeometryCollection(ChildCollection):
    """Class representing a collection of 3D grid geometry objects in Sumo"""

    def __init__(
        self,
        sumo: SumoClient,
        case_uuid: str,
        query: Dict = None,
        pit: Pit = None,
    ):
        """
        Args:
            sumo (SumoClient): connection to Sumo
            case_uuid (str): parent case uuid
            query (dict): elastic query object
            pit (Pit): point in time
        """
        super().__init__("cpgrid", sumo, case_uuid, query, pit)

        self._aggregation_cache = {}

    def __getitem__(self, index) -> Grid3dGeometry:
        doc = super().__getitem__(index)
        return Grid3dGeometry(self._sumo, doc)

    async def getitem_async(self, index: int) -> Grid3dGeometry:
        doc = await super().getitem_async(index)
        return Grid3dGeometry(self._sumo, doc)

    def filter(
        self,
        name: Union[str, List[str], bool] = None,
        tagname: Union[str, List[str], bool] = None,
        vertical_domain: Union[str, List[str], bool] = None,
        iteration: Union[str, List[str], bool] = None,
        realization: Union[int, List[int], bool] = None,
        aggregation: Union[str, List[str], bool] = None,
        stage: Union[str, List[str], bool] = None,
        uuid: Union[str, List[str], bool] = None,
    ) -> "Grid3dGeometryCollection":
        """Filter grid geometries

        Apply filters to the Grid3dGeometryCollection and get a new filtered instance.

        Args:
            name (Union[str, List[str], bool]): grid geometry name
            tagname (Union[str, List[str], bool]): grid geometry tagname
            iteration (Union[int, List[int], bool]): iteration id
            realization Union[int, List[int], bool]: realization id
            aggregation (Union[str, List[str], bool]): aggregation operation
            stage (Union[str, List[str], bool]): context/stage
            uuid (Union[str, List[str], bool]): grid geometry object uuid
            vertical_domain (Union[str, List[str], bool]): grid geometry vertical_domain

        Returns:
            Grid3dGeometryCollection: A filtered Grid3dGeometryCollection

        """

        query = super()._add_filter(
            name=name,
            tagname=tagname,
            iteration=iteration,
            realization=realization,
            aggregation=aggregation,
            stage=stage,
            uuid=uuid,
            vertical_domain=vertical_domain,
        )

        return Grid3dGeometryCollection(self._sumo, self._case_uuid, query, self._pit)
