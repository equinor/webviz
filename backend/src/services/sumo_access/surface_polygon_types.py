from __future__ import annotations

from typing import List

from pydantic import BaseModel


class SurfacePolygonsDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    valid_attributes_for_name: List[List[int]]

    @classmethod
    def create_empty(cls) -> SurfacePolygonsDirectory:
        return cls(attributes=[], names=[], valid_attributes_for_name=[])
