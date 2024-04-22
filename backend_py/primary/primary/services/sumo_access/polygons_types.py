from __future__ import annotations

from pydantic import BaseModel

from .generic_types import SumoContent


class PolygonsMeta(BaseModel):
    name: str
    tagname: str
    content: SumoContent
    is_stratigraphic: bool
