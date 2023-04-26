from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class StatisticFunction(Enum):
    MIN = "MIN"
    MAX = "MAX"
    MEAN = "MEAN"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"
    STD = "STD"

    @classmethod
    def from_string_value(cls, value: str) -> Optional["StatisticFunction"]:
        try:
            return cls(value)
        except ValueError:
            return None


class DynamicSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    date_strings: List[str]

    @classmethod
    def create_empty(cls):
        return cls(attributes=[], names=[], date_strings=[])


class StaticSurfaceDirectory(BaseModel):
    names: List[str]
    attributes: List[str]
    valid_attributes_for_name: List[List[int]]

    @classmethod
    def create_empty(cls):
        return cls(attributes=[], names=[])
