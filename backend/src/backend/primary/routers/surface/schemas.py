from enum import Enum
from typing import Optional

from pydantic import BaseModel

from src.services.smda_access.types import StratigraphicFeature
from src.services.utils.b64 import B64FloatArray


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
    TIME = "time"  # Values are time (ms)
    PROPERTY = "property"  # Values are generic, but typically extracted from a gridmodel
    SEISMIC = "seismic"  # Values are extracted from a seismic cube
    THICKNESS = "thickness"  # Values are isochores (real or conceptual difference between two depth surfaces)
    ISOCHORE = "isochore"  # Values are isochores (real or conceptual difference between two depth surfaces)
    FLUID_CONTACT = "fluid_contact"  # Values are fluid contacts (oil-water, gas-water, etc.)


class SurfaceMeta(BaseModel):
    name: str  # Svarte fm. top / Svarte fm. / Svarte fm. base
    name_is_stratigraphic_offical: bool
    stratigraphic_identifier: Optional[str] = None  # Svarte fm.
    relative_stratigraphic_level: Optional[int] = None
    parent_stratigraphic_identifier: Optional[str] = None
    stratigraphic_feature: Optional[StratigraphicFeature] = None  # Distinguish between horizon and unit
    attribute_name: str
    attribute_type: SurfaceAttributeType
    iso_date_or_interval: Optional[str] = None
    is_observation: bool  # Can only be true for seismic surfaces
    value_min: Optional[float] = None
    value_max: Optional[float] = None


class SurfaceData(BaseModel):
    x_ori: float
    y_ori: float
    x_count: int
    y_count: int
    x_inc: float
    y_inc: float
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    val_min: float
    val_max: float
    rot_deg: float
    values_b64arr: B64FloatArray


class XtgeoRegularGridSpec(BaseModel):
    ncol: int
    nrow: int
    xinc: float
    yinc: float
    xori: float
    yori: float
    rotation: float
