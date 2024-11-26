from pydantic import BaseModel


from typing import Dict, List, Literal


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
