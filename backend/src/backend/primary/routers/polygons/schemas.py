from typing import List, Optional
from enum import Enum

from pydantic import BaseModel


class PolygonsAttributeType(str, Enum):
    """
    To be revisited later when the metadata is more mature.
    """

    DEPTH = "depth"  # Values are depths
    TIME = "time"  # Values are time (ms)
    PROPERTY = "property"  # Values are generic, but typically extracted from a gridmodel
    SEISMIC = "seismic"  # Values are extracted from a seismic cube
    THICKNESS = "thickness"  # Values are isochores (real or conceptual difference between two depth surfaces)
    ISOCHORE = "isochore"  # Values are isochores (real or conceptual difference between two depth surfaces)
    FLUID_CONTACT = "fluid_contact"  # Values are fluid contacts (oil-water, gas-water, etc.)
    FIELD_OUTLINE = "field_outline"  # Values are field outlines
    PINCHOUT = "pinchout"  # Values are pinchouts
    SUBCROP = "subcrop"  # Values are subcrops
    FAULT_LINES = "fault_lines"  # Values are fault lines


class PolygonsMeta(BaseModel):
    name: str  # Svarte fm. top / Svarte fm. / Svarte fm. base
    name_is_stratigraphic_offical: bool
    stratigraphic_identifier: Optional[str] = None  # Svarte fm.
    relative_stratigraphic_level: Optional[int] = None
    parent_stratigraphic_identifier: Optional[str] = None
    attribute_name: str
    attribute_type: PolygonsAttributeType


class PolygonData(BaseModel):
    x_arr: List[float]
    y_arr: List[float]
    z_arr: List[float]
    poly_id: int | str
