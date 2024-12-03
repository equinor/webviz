from dataclasses import dataclass
from enum import StrEnum
from typing import Literal
from pydantic import BaseModel


class NodeType(StrEnum):
    PROD = "prod"
    INJ = "inj"
    OTHER = "other"


class EdgeOrNode(StrEnum):
    EDGE = "edge"
    NODE = "node"


class NetworkModeOptions(StrEnum):
    STATISTICS = "statistics"
    SINGLE_REAL = "single_real"


@dataclass
class NodeClassification:
    """
    Classification of a node in the flow network.
    Can be producer, injector and other over the time period of network.
    """

    # pylint: disable=invalid-name
    IS_PROD: bool
    IS_INJ: bool
    IS_OTHER: bool


@dataclass
class NetworkClassification:
    """
    Classification of a flow network.
    Contains the name of the terminal/top node, and whether what type of injectors are present
    """

    # pylint: disable=invalid-name
    TERMINAL_NODE: str
    HAS_GAS_INJ: bool
    HAS_WATER_INJ: bool


class DataType(StrEnum):
    WELL_STATUS = "well_status"
    OILRATE = "oilrate"
    GASRATE = "gasrate"
    WATERRATE = "waterrate"
    WATERINJRATE = "waterinjrate"
    GASINJRATE = "gasinjrate"
    PRESSURE = "pressure"
    BHP = "bhp"
    WMCTL = "wmctl"


@dataclass
class SummaryVectorInfo:
    """
    Info/metadata for a summary vector for a node in the network
    """

    # pylint: disable=invalid-name
    DATATYPE: DataType
    EDGE_NODE: EdgeOrNode


# For each node, the summary vectors needed to create the flow network dataset
@dataclass
class NodeSummaryVectorsInfo:
    # Dict with summary vector name as key, and its metadata as values
    # E.g.: {sumvec_1: SummaryVectorInfo, sumvec_2: SummaryVectorInfo, ...}
    # pylint: disable=invalid-name
    SMRY_INFO: dict[str, SummaryVectorInfo]


@dataclass
class FlowNetworkSummaryVectorsInfo:
    """
    Dataclass to hold summary vectors info for the flow network.

    - node_summary_vectors_info_dict - Dict with node name and all its summary vectors info as value
    - all_summary_vectors - List of all summary vectors present in the flow network
    - edge_summary_vectors - List of summary vectors used for edges in the flow network
    """

    # Dict with node as key, and all the summary vectors w/ metadata for the node as value
    node_summary_vectors_info_dict: dict[str, NodeSummaryVectorsInfo]
    all_summary_vectors: set[str]  # All summary vectors present in the group tree
    edge_summary_vectors: set[str]  # All summary vectors used for edges in the group tree


@dataclass
class StaticNodeWorkingData:
    """
    Static working data for a node in the network.

    Data independent of dates, used for building the flow network.
    """

    node_name: str  # Redundant, but kept for debugging purposes
    node_classification: NodeClassification
    node_summary_vectors_info: dict[str, SummaryVectorInfo]


# ! Explicitly using a pydantict model to avoid unneccessary re-computations when converting from service results to API schema-payload
class NetworkNode(BaseModel):
    node_type: Literal["Group", "Well"]
    node_label: str
    edge_label: str
    node_data: dict[str, list[float]]
    edge_data: dict[str, list[float]]
    children: list["NetworkNode"]


@dataclass
class DatedFlowNetwork:
    dates: list[str]
    # NOTE: This should likely be changed to "network", but that would require rewrites all the way to the subsurface component.
    tree: NetworkNode


@dataclass
class FlowNetworkMetadata:
    key: str
    label: str
