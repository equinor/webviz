from typing import List
from enum import Enum
from primary.services.sumo_access.group_tree_types import GroupTreeMetadata, DatedTree
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


class NodeType(str, Enum):
    PROD = "prod"
    INJ = "inj"
    OTHER = "other"


class GroupTreeData(BaseModel):
    edge_metadata_list: List[GroupTreeMetadata]
    node_metadata_list: List[GroupTreeMetadata]
    dated_trees: List[DatedTree]
