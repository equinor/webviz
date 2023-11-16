from typing import List, Optional
from enum import Enum

from pydantic import BaseModel

# Discuss naming:
# For realization output
# - EnsembleScalarResponse
# - EnsembleMembersScalarResponse
# - EnsembleRealizationsScalarResponse
# - EnsembleRealizationsResponse
# - ScalarRealizationsResponse
# - RealizationsScalarResponse
# - ScalarResponseRealizations


# For statistical output
# - EnsembleStatisticsResponse
# - EnsembleStatisticsScalarResponse


class EnsembleScalarResponse(BaseModel):
    """A generic type for a scalar response from each of the members of the ensemble."""

    realizations: List[int]
    values: List[float]
    name: Optional[str] = None
    unit: Optional[str] = None  # How to handle the case where the response is a vector? e.g. name could be an object
    # ensemble_id:str ??


class EnsembleStatisticsResponse(BaseModel):
    # ensemble_id: str ??
    mean: float
    sd: float
    p10: float
    p50: float
    p90: float
    min: float
    max: float
    included_realizations: List[int]
    unit: Optional[str] = None
    name: Optional[str] = None  # How to handle the case where the response is a vector? e.g. name could be an object


class EnsembleCorrelations(BaseModel):
    names: List[str]
    values: List[float]


class SumoTableSchema(BaseModel):
    """The necessary information to query Sumo for a specific table
    Needs discussion."""

    name: str  # For summary this would be "summary". For e.g. PVT, Relperm it would be DROGON-<realization>
    tagname: str  # For summary this would be e.g. "eclipse". For PVT it would be PVT. ...
    column_names: List[str]
    # context?
    # stage? (realization, iteration, collection)


class SumoContent(str, Enum):
    """Enum for the different values of the `content` metadata key in a Sumo object."""

    DEPTH = "depth"
    TIME = "time"
    PROPERTY = "property"
    SEISMIC = "seismic"
    THICKNESS = "thickness"
    ISOCHORE = "isochore"
    FLUID_CONTACT = "fluid_contact"
    FIELD_OUTLINE = "field_outline"
    PINCHOUT = "pinchout"
    SUBCROP = "subcrop"
    FAULT_LINES = "fault_lines"

    @classmethod
    def values(cls) -> List[str]:
        return [_.value for _ in list(cls)]

    @classmethod
    def has(cls, value: str) -> bool:
        return value in cls.values()


class SumoClass(str, Enum):
    """Enum for the different values of the `class` metadata key in a Sumo object."""

    SURFACE = "surface"
    GRID = "grid"
    CUBE = "cube"
    TABLE = "table"
    POLYGONS = "polygons"
    POINTS = "points"

    @classmethod
    def values(cls) -> List[str]:
        return [_.value for _ in list(cls)]

    @classmethod
    def has(cls, value: str) -> bool:
        return value in cls.values()
