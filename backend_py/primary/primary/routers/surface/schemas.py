from enum import Enum
from typing import List, Literal

from pydantic import BaseModel, ConfigDict
from webviz_pkg.core_utils.b64 import B64FloatArray

from primary.services.sumo_access.generic_types import SumoContent


class SurfaceStatisticFunction(str, Enum):
    MEAN = "MEAN"
    STD = "STD"
    MIN = "MIN"
    MAX = "MAX"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"


class SurfaceAttributeType(str, Enum):
    """A surface has a single array with values, e.g. depth, time, property, seismic, thickness.
    Only surfaces with depth and time have z-values that can be plotted in 3D.
    The other attributes are scalar values that can be plotted in 2D or used as colormapping for 3D surfaces.

    Ideally if the attribute is a scalar, there should be corresponding z-values, but this information is not
    available in the metadata.

    To be revisited later when the metadata is more mature.
    """

    DEPTH = "depth"  # Values are depths
    FACIES_THICKNESS = "facies_thickness"
    FLUID_CONTACT = "fluid_contact"  # Values are fluid contacts (oil-water, gas-water, etc.)
    PINCHOUT = "pinchout"
    PROPERTY = "property"  # Values are generic, but typically extracted from a gridmodel
    SEISMIC = "seismic"  # Values are extracted from a seismic cube
    SUBCROP = "subcrop"
    THICKNESS = "thickness"  # Values are isochores (real or conceptual difference between two depth surfaces)
    TIME = "time"  # Values are time (ms)
    VELOCITY = "velocity"
    VOLUMES = "volumes"
    UNKNOWN = "UNKNOWN"

    @classmethod
    def from_sumo_content(cls, sumo_content_enum: SumoContent) -> "SurfaceAttributeType":
        try:
            return SurfaceAttributeType(sumo_content_enum)
        except ValueError:
            return SurfaceAttributeType.UNKNOWN


class SurfaceTimeType(str, Enum):
    NO_TIME = "NO_TIME"
    TIME_POINT = "TIME_POINT"
    INTERVAL = "INTERVAL"


class SurfaceMeta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str  # Svarte fm. top / Svarte fm. / Svarte fm. base
    name_is_stratigraphic_offical: bool
    attribute_name: str
    attribute_type: SurfaceAttributeType
    time_type: SurfaceTimeType
    is_observation: bool  # Can only be true for seismic surfaces
    value_min: float | None
    value_max: float | None


class SurfaceMetaSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    surfaces: list[SurfaceMeta]
    time_points_iso_str: list[str]
    time_intervals_iso_str: list[str]
    surface_names_in_strat_order: list[str]


class BoundingBox2d(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min_x: float
    min_y: float
    max_x: float
    max_y: float


class SurfaceDef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    npoints_x: int  # number of grid points in the x direction
    npoints_y: int  # number of grid points in the y direction
    inc_x: float  # increment/spacing between points in x direction
    inc_y: float  # increment/spacing between points in y direction
    origin_utm_x: float  # x-coordinate of the origin of the surface grid in UTM
    origin_utm_y: float  # y-coordinate of the origin of the surface grid in UTM
    rot_deg: float  # rotation of surface in degrees around origin, rotation is counter-clockwise from the x-axis


class SurfaceDataBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    format: Literal["float", "png"]
    surface_def: SurfaceDef
    transformed_bbox_utm: BoundingBox2d
    value_min: float
    value_max: float


class SurfaceDataFloat(SurfaceDataBase):
    format: Literal["float"] = "float"
    values_b64arr: B64FloatArray


class SurfaceDataPng(SurfaceDataBase):
    format: Literal["png"] = "png"
    png_image_base64: str


class SurfaceIntersectionData(BaseModel):
    """
    Definition of a surface intersection made from a set of (x, y) coordinates.

    name: Name of the surface
    z_points: Array of z-points (depth values) at the intersection points, i.e. depth value for each (x,y) point.
    cum_lengths: Cumulative length values at the intersection points, i.e. accumulated length between each element in the z points.

    """

    name: str
    z_points: List[float]
    cum_lengths: List[float]


class SurfaceIntersectionCumulativeLengthPolyline(BaseModel):
    """
    (x, y) points defining a polyline in domain coordinate system, to retrieve intersection of a surface, with a cumulative length
    between at each (x, y)-point coordinates in domain coordinate system.

    Expect equal number of x- and y-points.

    x_points: X-coordinates of polyline points.
    y_points: Y-coordinates of polyline points.
    cum_lengths: Cumulative lengths of the polyline segments, i.e. the length of the polyline up to each (x,y) point.

    The cumulative lengths can be e.g. measured depth along a well path.

    Note: Coordinates are in domain coordinate system (UTM)

    Note: Verify if cum_lengths is necessary with respect to xtgeo
    """

    x_points: List[float]
    y_points: List[float]
    cum_lengths: List[float]


class SurfaceRealizationSampleValues(BaseModel):
    realization: int
    sampled_values: list[float]


class PointSetXY(BaseModel):
    x_points: list[float]
    y_points: list[float]
