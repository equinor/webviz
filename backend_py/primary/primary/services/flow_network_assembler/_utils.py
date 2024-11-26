import logging


from enum import StrEnum

from primary.services.sumo_access.group_tree_types import DataType, EdgeOrNode, TreeType
from ._group_tree_dataframe_model import GroupTreeDataframeModel


LOGGER = logging.getLogger(__name__)


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


def compute_tree_well_vectors(group_tree_model: GroupTreeDataframeModel, data_type: DataType) -> set[str]:
    """Given a vector type (WSTAT, WOPT, etc), returns a list of full summary vector names for each well in a group tree model; e.g. "WSTAT:A1", "WSTAT:A2", etc. Returns an empty array (and logs a warning) if the datatype has no vector"""

    vector_name = WELL_DATATYPE_VECTOR_MAP.get(data_type)

    if vector_name is None:
        LOGGER.warning("No recognized well vector for type %s", data_type)
        return set()

    return {f"{vector_name}:{well}" for well in group_tree_model.group_tree_wells}


def compute_tree_group_vectors(group_tree_model: GroupTreeDataframeModel, data_type: DataType) -> set[str]:
    """Given a vector type (GOPR, GGIR, etc), returns a list of full summary vector names for each group in a group tree model. Returns an empty array (and logs a warning) if the datatype has no vector"""
    grup_tree_vectors = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.GRUPTREE]
    bran_prop_vectors = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.BRANPROP]

    v_name_grup = grup_tree_vectors.get(data_type)
    v_name_bran = bran_prop_vectors.get(data_type)

    # Arguably excessive to check both, since they both have the same data-types. Keeping it as two checks just incase the maps diverge down-the-line
    if v_name_grup is None and v_name_bran is None:
        LOGGER.warning("No recognized group vectors for type %s", data_type)
        return set()

    return {
        f"{v_name}:{group}"
        for v_name in (v_name_grup, v_name_bran)
        if v_name is not None
        for group in group_tree_model.group_tree_groups
    }


def compute_all_well_vectors(group_tree_model: GroupTreeDataframeModel) -> set[str]:
    data_types = WELL_DATATYPE_VECTOR_MAP.keys()

    res = set()
    for data_type in data_types:
        res |= compute_tree_well_vectors(group_tree_model, data_type)

    return res


def compute_all_group_vectors(group_tree_model: GroupTreeDataframeModel) -> set[str]:
    grup_data_types = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.GRUPTREE].keys()
    bran_data_types = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType.BRANPROP].keys()
    all_data_types = set(grup_data_types) | set(bran_data_types)

    res = set()
    for data_type in all_data_types:
        res |= compute_tree_well_vectors(group_tree_model, data_type)

    return res


def get_all_vectors_of_interest_for_tree(group_tree_model: GroupTreeDataframeModel) -> set[str]:
    """
    Create a list of vectors based on the possible combinations of vector datatypes and vector nodes
    for a group tree

    This implies vectors for field, group and well.

    Only returns the candidates which exist among the valid vectors
    """

    # Find all summary vectors with field vectors
    field_vectors = set(FIELD_DATATYPE_VECTOR_MAP.values())
    # Find all summary vectors with group tree wells
    well_vectors = compute_all_well_vectors(group_tree_model)
    # Find all summary vectors with group tree groups
    group_vectors = compute_all_group_vectors(group_tree_model)

    all_vectors = field_vectors | well_vectors | group_vectors

    # Ensure non duplicated vectors
    return all_vectors


def create_sumvec_from_datatype_nodename_and_keyword(
    datatype: DataType,
    nodename: str,
    keyword: str,
) -> str:
    """Returns the correct summary vector for a given
    * datatype: oilrate, gasrate etc
    * nodename: FIELD, well name or group name in Eclipse network
    * keyword: GRUPTREE, BRANPROP or WELSPECS
    """

    if nodename == "FIELD":
        datatype_ecl = FIELD_DATATYPE_VECTOR_MAP[datatype]
        if datatype == "pressure":
            return f"{datatype_ecl}:{nodename}"
        return datatype_ecl
    try:
        if keyword == "WELSPECS":
            datatype_ecl = WELL_DATATYPE_VECTOR_MAP[datatype]
        elif keyword in TreeType._member_names_:
            datatype_ecl = GROUPTYPE_DATATYPE_VECTORS_MAP[TreeType[keyword]][datatype]
    except KeyError as exc:
        error = (
            f"Summary vector not found for eclipse keyword: {keyword}, "
            f"data type: {datatype.value} and node name: {nodename}. "
        )
        raise KeyError(error) from exc
    return f"{datatype_ecl}:{nodename}"


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


def get_data_label(datatype: DataType) -> str:
    """Returns a more readable label for the summary datatypes"""
    label = DATATYPE_LABEL_MAP.get(datatype)
    if label is None:
        raise ValueError(f"Label for datatype {datatype.value} not implemented.")
    return label
