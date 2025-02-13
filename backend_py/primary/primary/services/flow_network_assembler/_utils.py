import logging
import pandas as pd
import numpy as np

from primary.services.sumo_access.group_tree_types import TreeType
from .flow_network_types import (
    CategorizedNodeSummaryVectors,
    NodeClassification,
    SummaryVectorInfo,
    NetworkClassification,
    NodeSummaryVectorsInfo,
    EdgeOrNode,
    DataType,
    NodeType,
)


LOGGER = logging.getLogger(__name__)

NODE_TYPE_ENUM_TO_STRING_MAPPING = {
    NodeType.INJ: "Injector",
    NodeType.PROD: "Producer",
    NodeType.OTHER: "Other",
}


FIELD_DATATYPE_VECTOR_MAP = {
    DataType.OILRATE: "FOPR",
    DataType.GASRATE: "FGPR",
    DataType.WATERRATE: "FWPR",
    DataType.WATERINJRATE: "FWIR",
    DataType.GASINJRATE: "FGIR",
    DataType.PRESSURE: "GPR",
}
GROUPTYPE_DATATYPE_VECTORS_MAP = {
    TreeType.GRUPTREE: {
        DataType.OILRATE: "GOPR",
        DataType.GASRATE: "GGPR",
        DataType.WATERRATE: "GWPR",
        DataType.WATERINJRATE: "GWIR",
        DataType.GASINJRATE: "GGIR",
        DataType.PRESSURE: "GPR",
    },
    # BRANPROP can not be used for injection, but the nodes
    # might also be GNETINJE and could therefore have injection.
    TreeType.BRANPROP: {
        DataType.OILRATE: "GOPRNB",
        DataType.GASRATE: "GGPRNB",
        DataType.WATERRATE: "GWPRNB",
        DataType.WATERINJRATE: "GWIR",
        DataType.GASINJRATE: "GGIR",
        DataType.PRESSURE: "GPR",
    },
}
WELL_DATATYPE_VECTOR_MAP = {
    DataType.WELL_STATUS: "WSTAT",
    DataType.OILRATE: "WOPR",
    DataType.GASRATE: "WGPR",
    DataType.WATERRATE: "WWPR",
    DataType.WATERINJRATE: "WWIR",
    DataType.GASINJRATE: "WGIR",
    DataType.PRESSURE: "WTHP",
    DataType.BHP: "WBHP",
    DataType.WMCTL: "WMCTL",
}

DATATYPE_LABEL_MAP = {
    DataType.OILRATE: "Oil Rate",
    DataType.GASRATE: "Gas Rate",
    DataType.WATERRATE: "Water Rate",
    DataType.WATERINJRATE: "Water Inj Rate",
    DataType.GASINJRATE: "Gas Inj Rate",
    DataType.PRESSURE: "Pressure",
    DataType.BHP: "BHP",
    DataType.WMCTL: "WMCTL",
}


def compute_tree_well_vectors(group_tree_wells: list[str], data_type: DataType) -> set[str]:
    """Given a vector type (WSTAT, WOPT, etc), returns a list of full summary vector names for each well in a group tree model; e.g. "WSTAT:A1", "WSTAT:A2", etc. Returns an empty array (and logs a warning) if the datatype has no vector"""

    vector_name = WELL_DATATYPE_VECTOR_MAP.get(data_type)

    if vector_name is None:
        LOGGER.warning("No recognized well vector for type %s", data_type)
        return set()

    return {f"{vector_name}:{well}" for well in group_tree_wells}


def compute_tree_group_vectors(group_tree_groups: list[str], data_type: DataType) -> set[str]:
    """Given a vector type (GOPR, GGIR, etc), returns a list of full summary vector names for each group in a group tree model. Returns an empty array (and logs a warning) if the datatype has no vector"""
    grup_tree_vectors = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.GRUPTREE]
    bran_prop_vectors = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.BRANPROP]

    v_name_grup = grup_tree_vectors.get(data_type)
    v_name_bran = bran_prop_vectors.get(data_type)
    v_names = [v for v in (v_name_grup, v_name_bran) if v is not None]

    if len(v_names) == 0:
        LOGGER.warning("No recognized group vectors for type %s", data_type)
        return set()

    # Nested loop to create all possible combinations
    return {f"{v_name}:{group}" for v_name in v_names for group in group_tree_groups}


def compute_all_well_vectors(group_tree_wells: list[str]) -> set[str]:
    data_types = WELL_DATATYPE_VECTOR_MAP.keys()

    res = set()
    for data_type in data_types:
        res |= compute_tree_well_vectors(group_tree_wells, data_type)

    return res


def compute_all_group_vectors(group_tree_groups: list[str]) -> set[str]:
    grup_data_types = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.GRUPTREE].keys()
    bran_data_types = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.BRANPROP].keys()
    all_data_types = set(grup_data_types) | set(bran_data_types)

    res = set()
    for data_type in all_data_types:
        res |= compute_tree_group_vectors(group_tree_groups, data_type)

    return res


def get_all_vectors_of_interest_for_tree(group_tree_wells: list[str], group_tree_groups: list[str]) -> set[str]:
    """
    Create a list of vectors based on the possible combinations of vector datatypes and vector nodes
    for a group tree

    This implies vectors for field, group and well.

    Only returns the candidates which exist among the valid vectors
    """

    # Find all summary vectors with field vectors
    field_vectors = set(FIELD_DATATYPE_VECTOR_MAP.values())
    # Find all summary vectors with group tree wells
    well_vectors = compute_all_well_vectors(group_tree_wells)
    # Find all summary vectors with group tree groups
    group_vectors = compute_all_group_vectors(group_tree_groups)

    all_vectors = field_vectors | well_vectors | group_vectors

    return all_vectors


def create_sumvec_from_datatype_node_name_and_keyword(
    datatype: DataType,
    node_name: str,
    keyword: str,
) -> str:
    """Returns the correct summary vector for a given
    * datatype: oilrate, gasrate etc
    * node_name: FIELD, well name or group name in Eclipse network
    * keyword: GRUPTREE, BRANPROP or WELSPECS
    """

    if node_name == "FIELD":
        datatype_ecl = FIELD_DATATYPE_VECTOR_MAP[datatype]
        if datatype == "pressure":
            return f"{datatype_ecl}:{node_name}"
        return datatype_ecl
    try:
        if keyword == "WELSPECS":
            datatype_ecl = WELL_DATATYPE_VECTOR_MAP[datatype]
        elif keyword in [t.value for t in TreeType]:
            datatype_ecl = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType[keyword]][datatype]
    except KeyError as exc:
        error = (
            f"Summary vector not found for eclipse keyword: {keyword}, "
            f"data type: {datatype.value} and node name: {node_name}. "
        )
        raise KeyError(error) from exc
    return f"{datatype_ecl}:{node_name}"


def get_tree_element_for_data_type(data_type: DataType) -> EdgeOrNode:
    """Returns if a given datatype is a tree edge (typically rates) or a node (f.ex pressures)"""
    if data_type in [
        DataType.OILRATE,
        DataType.GASRATE,
        DataType.WATERRATE,
        DataType.WATERINJRATE,
        DataType.GASINJRATE,
    ]:
        return EdgeOrNode.EDGE
    if data_type in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]:
        return EdgeOrNode.NODE
    raise ValueError(f"Data type {data_type.value} not implemented.")


def get_label_for_datatype(datatype: DataType) -> str:
    """Returns a more readable label for the summary datatypes"""
    label = DATATYPE_LABEL_MAP.get(datatype)
    if label is None:
        raise ValueError(f"Label for datatype {datatype.value} not implemented.")
    return label


def get_node_vectors_info_and_categorized_node_summary_vectors_from_name_and_keyword(
    node_name: str,
    node_keyword: str,
    node_classifications: dict[str, NodeClassification],
    tree_classification: NetworkClassification,
) -> tuple[NodeSummaryVectorsInfo, CategorizedNodeSummaryVectors]:
    if not isinstance(node_name, str) or not isinstance(node_keyword, str):
        raise ValueError("Nodename and keyword must be strings")

    node_classification = node_classifications[node_name]

    datatypes = _compute_node_datatypes_for_name_and_keyword(
        node_name, node_keyword, node_classification, tree_classification
    )

    node_vectors_info = NodeSummaryVectorsInfo(SMRY_INFO={})
    all_sumvecs = set()
    edge_sumvecs = set()

    for datatype in datatypes:
        sumvec_name = create_sumvec_from_datatype_node_name_and_keyword(datatype, node_name, node_keyword)
        edge_or_node = get_tree_element_for_data_type(datatype)

        all_sumvecs.add(sumvec_name)

        if edge_or_node == EdgeOrNode.EDGE:
            edge_sumvecs.add(sumvec_name)

        node_vectors_info.SMRY_INFO[sumvec_name] = SummaryVectorInfo(DATATYPE=datatype, EDGE_NODE=edge_or_node)

    return (
        node_vectors_info,
        CategorizedNodeSummaryVectors(all_summary_vectors=all_sumvecs, edge_summary_vectors=edge_sumvecs),
    )


def _compute_node_datatypes_for_name_and_keyword(
    node_name: str,
    node_keyword: str,
    node_classification: NodeClassification,
    tree_classification: NetworkClassification,
) -> list[DataType]:

    is_prod = node_classification.IS_PROD
    is_inj = node_classification.IS_INJ
    is_terminal = node_name == tree_classification.TERMINAL_NODE
    is_wellspec = node_keyword == "WELSPECS"

    datatypes = [DataType.PRESSURE]

    if is_wellspec:
        datatypes += [DataType.BHP, DataType.WMCTL]

    if not is_terminal:
        if is_prod:
            datatypes += [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
        if is_inj and tree_classification.HAS_WATER_INJ:
            datatypes.append(DataType.WATERINJRATE)
        if is_inj and tree_classification.HAS_GAS_INJ:
            datatypes.append(DataType.GASINJRATE)

    return datatypes


def is_valid_node_type(node_classification: NodeClassification, valid_node_types: set[NodeType]) -> bool:
    """Returns True if the node classification is a valid node type"""
    if node_classification.IS_PROD and NodeType.PROD in valid_node_types:
        return True
    if node_classification.IS_INJ and NodeType.INJ in valid_node_types:
        return True
    if node_classification.IS_OTHER and NodeType.OTHER in valid_node_types:
        return True
    return False


def create_edge_label_list_from_vfp_table_column(vfp_table_column: pd.Series) -> list[str]:
    """
    Creates an edge label list based on the column named "VFP_TABLE".

    If the VFP_TABLE column is not present, the function will raise a ValueError.
    """
    if vfp_table_column.empty:
        raise ValueError("VFP_TABLE column is empty.")

    edge_labels: list[str] = []
    for vfp_nb in vfp_table_column:
        if vfp_nb in [None, 9999] or np.isnan(vfp_nb):
            edge_labels.append("")
        else:
            edge_labels.append(f"VFP {int(vfp_nb)}")

    return edge_labels
