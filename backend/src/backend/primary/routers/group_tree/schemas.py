from typing import Any, Dict, List
from enum import Enum

from pydantic import BaseModel


class Frequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"


class StatOption(str, Enum):
    MEAN = "MEAN"
    P10 = "P10"
    P90 = "P90"
    P50 = "P50"
    MIN = "MIN"
    MAX = "MAX"


class GroupTreeData(BaseModel):
    edge_metadata_list: List[Dict[str, str]]
    node_metadata_list: List[Dict[str, str]]
    dated_trees: List[Dict[Any, Any]]
