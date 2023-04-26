from enum import Enum
from typing import Optional


class StatisticFunction(Enum):
    MIN = "MIN"
    MAX = "MAX"
    MEAN = "MEAN"
    STD = "STD"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"

    @classmethod
    def from_string_value(cls, value: str) -> Optional["StatisticFunction"]:
        try:
            return cls(value)
        except ValueError:
            return None
