from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class Frequency(Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"

    @classmethod
    def from_string_value(cls, value: str) -> Optional["Frequency"]:
        try:
            return cls(value)
        except ValueError:
            return None


class VectorInfo(BaseModel):
    name: str
    has_historical: bool


class VectorMetadata(BaseModel):
    name: str
    unit: str
    is_total: bool
    is_rate: bool
    is_historical: bool
    keyword: str
    wgname: Optional[str] = None
    get_num: Optional[int] = None


class RealizationVector(BaseModel):
    realization: int
    timestamps_utc_ms: List[int]
    values: List[float]
    metadata: VectorMetadata


class HistoricalVector(BaseModel):
    timestamps_utc_ms: List[int]
    values: List[float]
    metadata: VectorMetadata
