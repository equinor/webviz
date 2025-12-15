from webviz_services.flow_network_assembler.flow_network_types import NodeType, TreeType

from . import schemas


def from_api_node_type(api_node_type: schemas.NodeType) -> NodeType:
    """
    Convert from API NodeType enum to internal NodeType enum
    """
    if api_node_type == schemas.NodeType.INJ:
        return NodeType.INJ
    if api_node_type == schemas.NodeType.PROD:
        return NodeType.PROD
    if api_node_type == schemas.NodeType.OTHER:
        return NodeType.OTHER

    raise ValueError(f"Unsupported API node type: {api_node_type}")


def to_api_tree_type(tree_type: TreeType) -> str:
    """
    Convert from internal TreeType enum to API tree type string
    """
    if tree_type == TreeType.GRUPTREE:
        return "Extended Network"
    if tree_type == TreeType.BRANPROP:
        return "Standard Network"

    raise ValueError(f"Unsupported tree type: {tree_type}")


def to_api_flow_network_per_tree_type(
    network_per_tree_type: dict[
        TreeType,
        tuple[
            list[schemas.DatedFlowNetwork],
            list[schemas.FlowNetworkMetadata],
            list[schemas.FlowNetworkMetadata],
        ],
    ],
) -> schemas.FlowNetworkPerTreeType:
    """
    Convert internal flow network per tree type to API schema

    NOTE: DatedFlowNetwork is already using a pydantict model to avoid unnecessary re-computations when
    performing this converting to API schema-payload
    """
    tree_type_flow_network_map: dict[str, schemas.FlowNetworkData] = {}

    for tree_type, flow_network_data in network_per_tree_type.items():
        dated_networks, edge_metadata, node_metadata = flow_network_data
        tree_type_str = to_api_tree_type(tree_type)
        tree_type_flow_network_map[tree_type_str] = schemas.FlowNetworkData(
            edgeMetadataList=edge_metadata, nodeMetadataList=node_metadata, datedNetworks=dated_networks
        )

    return schemas.FlowNetworkPerTreeType(tree_type_flow_network_map=tree_type_flow_network_map)
