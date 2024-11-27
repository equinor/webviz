from dataclasses import dataclass
from typing import Dict, List, Literal
from pydantic import BaseModel

from primary.services.sumo_access.group_tree_types import DataType, EdgeOrNode


class NetworkNode(BaseModel):
    # NOTE: Not to be confused with the NodeType enum below. We should probably change to some more distinct names at some later time
    node_type: Literal["Group", "Well"]
    node_label: str
    edge_label: str
    node_data: Dict[str, List[float]]
    edge_data: Dict[str, List[float]]
    children: List["NetworkNode"]


class DatedFlowNetwork(BaseModel):
    dates: List[str]
    # NOTE: This should likely be changed to "network", but that would require rewrites all the way to the subsurface component.
    tree: NetworkNode


class FlowNetworkMetadata(BaseModel):
    key: str
    label: str


class FlowNetworkData(BaseModel):
    edge_metadata_list: List[FlowNetworkMetadata]
    node_metadata_list: List[FlowNetworkMetadata]
    dated_trees: List[DatedFlowNetwork]


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
class TreeClassification:
    """
    Classification of a node in the flow network.
    Can be producer, injector and other over the time period of network.
    """

    # pylint: disable=invalid-name
    TERMINAL_NODE: str
    HAS_GAS_INJ: bool
    HAS_WATER_INJ: bool


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
    SMRY_INFO: Dict[str, SummaryVectorInfo]


@dataclass
class FlowNetworkSummaryVectorsInfo:
    """
    Dataclass to hold summary vectors info for the flow network.

    - node_summary_vectors_info_dict - Dict with node name and all its summary vectors info as value
    - all_summary_vectors - List of all summary vectors present in the flow network
    - edge_summary_vectors - List of summary vectors used for edges in the flow network
    """

    # Dict with node as key, and all the summary vectors w/ metadata for the node as value
    node_summary_vectors_info_dict: Dict[str, NodeSummaryVectorsInfo]
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
    node_summary_vectors_info: Dict[str, SummaryVectorInfo]
