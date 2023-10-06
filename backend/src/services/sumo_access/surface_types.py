from __future__ import annotations

from typing import Optional

from pydantic import BaseModel
from .generic_types import SumoContent


class SurfaceMeta(BaseModel):
    name: str
    tagname: str
    iso_date_or_interval: Optional[str] = None
    content: SumoContent
    is_observation: bool
    is_stratigraphic: bool
    zmin: Optional[float] = None
    zmax: Optional[float] = None
