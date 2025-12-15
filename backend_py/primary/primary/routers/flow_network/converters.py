from webviz_services.flow_network_assembler.flow_network_types import TreeType

from . import schemas


def from_api_tree_type(tree_type: schemas.TreeType) -> TreeType:
    """
    Convert API tree type to internal TreeType enum
    """
    if tree_type == schemas.TreeType.EXTENDED_NETWORK:
        return TreeType.GRUPTREE
    elif tree_type == schemas.TreeType.PRODUCTION_NETWORK:
        return TreeType.BRANPROP
    else:
        raise ValueError(f"Unsupported tree type: {tree_type}")
