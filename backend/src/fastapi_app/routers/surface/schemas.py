from typing import List

from pydantic import BaseModel


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    time_or_interval_strings: List[str]

