from enum import Enum

from typing import List, Optional, Union

from pydantic import BaseModel


class SumoEnsembleParameter(BaseModel):
    name: str
    groupname: Optional[str]
    values: Union[List[float], List[int], List[str]]
    realizations: List[int]


class SumoContent(str, Enum):
    """Enum for the different values of the `content` metadata key in a Sumo object."""

    DEPTH = "depth"
    TIME = "time"
    PROPERTY = "property"
    WELLPICKS = "wellpicks"

    @classmethod
    def values(self):
        return [_.value for _ in list(self)]

    @classmethod
    def has(self, value):
        return value in self.values()


class SumoClass(str, Enum):
    """Enum for the different values of the `class` metadata key in a Sumo object."""

    SURFACE = "surface"
    GRID = "grid"
    CUBE = "cube"
    TABLE = "table"
    POLYGONS = "polygons"
    POINTS = "points"

    @classmethod
    def values(self):
        return [_.value for _ in list(self)]

    @classmethod
    def has(self, value):
        return value in self.values()
