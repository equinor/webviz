from pydantic import BaseModel
from .generic_types import SumoContent


class SurfaceMeta(BaseModel):
    name: str
    tagname: str
    iso_date_or_interval: str | None = None
    content: SumoContent
    is_observation: bool
    is_stratigraphic: bool
    zmin: float | None = None
    zmax: float | None = None
