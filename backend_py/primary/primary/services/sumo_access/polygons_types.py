from __future__ import annotations

from pydantic import BaseModel

from .generic_types import SumoContent


class PolygonsMeta(BaseModel):
    name: str
    tagname: str
    content: SumoContent
    is_stratigraphic: bool


class PolygonData(BaseModel):
    x_arr: list[float]
    y_arr: list[float]
    z_arr: list[float]
    poly_id: int | str
    name: str
