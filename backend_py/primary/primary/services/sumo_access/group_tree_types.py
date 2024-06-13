from enum import StrEnum
from typing import Dict, List, Literal

from pydantic import BaseModel


class GroupTreeMetadata(BaseModel):
    key: str
    label: str


class TreeNode(BaseModel):
    node_type: Literal["Group", "Well"]
    node_label: str
    edge_label: str
    node_data: Dict[str, List[float]]
    edge_data: Dict[str, List[float]]
    children: List["TreeNode"]


class DatedTree(BaseModel):
    dates: List[str]
    tree: TreeNode


class TreeType(StrEnum):
    GRUPTREE = "GRUPTREE"
    BRANPROP = "BRANPROP"


class TreeModeOptions(StrEnum):
    STATISTICS = "statistics"
    SINGLE_REAL = "single_real"


class StatOptions(StrEnum):
    MEAN = "mean"
    P10 = "p10"
    P50 = "p50"
    P90 = "p90"
    MAX = "max"
    MIN = "min"


class NodeType(StrEnum):
    PROD = "prod"
    INJ = "inj"
    OTHER = "other"


class DataType(StrEnum):
    OILRATE = "oilrate"
    GASRATE = "gasrate"
    WATERRATE = "waterrate"
    WATERINJRATE = "waterinjrate"
    GASINJRATE = "gasinjrate"
    PRESSURE = "pressure"
    BHP = "bhp"
    WMCTL = "wmctl"


class EdgeOrNode(StrEnum):
    EDGE = "edge"
    NODE = "node"


DataTypeToStringLabelMap = {
    DataType.OILRATE: "Oil Rate",
    DataType.GASRATE: "Gas Rate",
    DataType.WATERRATE: "Water Rate",
    DataType.WATERINJRATE: "Water Inj Rate",
    DataType.GASINJRATE: "Gas Inj Rate",
    DataType.PRESSURE: "Pressure",
    DataType.BHP: "BHP",
    DataType.WMCTL: "WMCTL",
}
