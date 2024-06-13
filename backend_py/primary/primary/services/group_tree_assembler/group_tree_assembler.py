import logging
from typing import Dict, List, Literal, Optional, Sequence, Tuple
from dataclasses import dataclass

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc

from fastapi import HTTPException
from primary.services.sumo_access.group_tree_access import GroupTreeAccess
from primary.services.sumo_access.group_tree_types import (
    DataType,
    DatedTree,
    EdgeOrNode,
    GroupTreeMetadata,
    NodeType,
    TreeNode,
    TreeModeOptions,
    TreeType,
)
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess

from ._group_tree_dataframe_model import (
    GroupTreeDataframeModel,
    GROUP_TREE_FIELD_DATATYPE_TO_VECTOR_MAP,
    TREE_TYPE_DATATYPE_TO_GROUP_VECTOR_DATATYPE_MAP,
    GROUPTREE_DATATYPE_TO_WELL_VECTOR_DATATYPE_MAP,
)

from webviz_pkg.core_utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)


@dataclass
class NodeClassification:
    """
    Classification of a node in the group tree.
    Can be producer, injector and other over the time period of the group tree.
    """

    IS_PROD: bool
    IS_INJ: bool
    IS_OTHER: bool


@dataclass
class SummaryVectorInfo:
    """
    Info/metadata for a summary vector for a node in the group tree
    """

    DATATYPE: DataType
    EDGE_NODE: EdgeOrNode


# For each node, the summary vectors needed to create the group tree dataset
@dataclass
class NodeSummaryVectorsInfo:
    # Dict with summary vector name as key, and its metadata as values
    # E.g.: {sumvec_1: SummaryVectorInfo, sumvec_2: SummaryVectorInfo, ...}
    SMRY_INFO: Dict[str, SummaryVectorInfo]


@dataclass
class GroupTreeSummaryVectorsInfo:
    """
    Dataclass to hold summary vectors info for the group tree.

    - node_summary_vectors_info_dict - Dict with node name and all its summary vectors info as value
    - all_summary_vectors - List of all summary vectors present in the group tree
    - edge_summary_vectors - List of summary vectors used for edges in the group tree
    """

    # Dict with node as key, and all the summary vectors w/ metadata for the node as value
    node_summary_vectors_info_dict: Dict[str, NodeSummaryVectorsInfo]
    all_summary_vectors: set[str]  # All summary vectors present in the group tree
    edge_summary_vectors: set[str]  # All summary vectors used for edges in the group tree


@dataclass
class StaticNodeWorkingData:
    """
    Static working data for a node in the group tree.

    Data independent of dates, used for building the group tree.
    """

    node_name: str  # Redundant, but kept for debugging purposes
    node_classification: NodeClassification
    node_summary_vectors_info: Dict[str, SummaryVectorInfo]


class GroupTreeAssembler:
    """
    Class to fetch group tree table data and summary data from access layers, and assemble
    the data into a format for the router layer.

    """

    def __init__(
        self,
        group_tree_access: GroupTreeAccess,
        summary_access: SummaryAccess,
        realization: int,
        summary_frequency: Frequency,
        node_types: set[NodeType],
        group_tree_mode: TreeModeOptions,
        terminal_node: str = "FIELD",
        tree_type: TreeType = TreeType.GRUPTREE,
        excl_well_startswith: Optional[List[str]] = None,
        excl_well_endswith: Optional[List[str]] = None,
    ):
        self._tree_mode = group_tree_mode

        # NOTE: Temporary only supporting single real
        if self._tree_mode != TreeModeOptions.SINGLE_REAL:
            raise ValueError("Only SINGLE_REAL mode is supported at the moment.")

        self._realization = realization
        self._group_tree_access = group_tree_access
        self._summary_access = summary_access
        self._terminal_node = terminal_node
        self._tree_type = tree_type
        self._excl_well_startswith = excl_well_startswith
        self._excl_well_endswith = excl_well_endswith
        self._summary_resampling_frequency = summary_frequency
        self._node_types = node_types

        self._has_waterinj = False
        self._has_gasinj = False

        self._group_tree_df: pd.DataFrame | None = None
        self._all_vectors: List[str] | None = None
        self._smry_table_sorted_by_date: pa.Table | None = None

        self._node_static_working_data_dict: Dict[str, StaticNodeWorkingData] | None = None

    async def _initialize_all_vectors_list_async(self) -> None:
        vector_info_arr = await self._summary_access.get_available_vectors_async()
        self._all_vectors = [vec.name for vec in vector_info_arr]

    async def fetch_and_initialize_async(self) -> None:
        """
        Fetch group tree and summary data from Sumo, and initialize the data structures needed to build the single realization
        group tree.

        This method initialize and create data structures for optimized access and performance for the single realization group tree
        with summary data.
        """
        if self._tree_mode != TreeModeOptions.SINGLE_REAL:
            raise ValueError("Tree mode must be SINGLE_REAL to initialize single realization data")
        if self._realization is None:
            raise ValueError("GroupTreeAssembler missing realization")

        timer = PerfTimer()

        await self._initialize_all_vectors_list_async()
        get_summary_vector_list_time_ms = timer.lap_ms()
        if self._all_vectors is None:
            raise ValueError("List of summary vectors has not been initialized")

        # Get group tree data from Sumo
        group_tree_table_df = await self._group_tree_access.get_group_tree_table(realization=self._realization)
        get_group_tree_table_time_ms = timer.lap_ms()
        if group_tree_table_df is None:
            raise HTTPException(status_code=404, detail="Group tree data not found")

        timer.lap_ms()

        # Initialize dataframe model
        group_tree_df_model = GroupTreeDataframeModel(group_tree_table_df, self._tree_type)
        initialize_grouptree_model_time_ms = timer.lap_ms()

        # Ensure "WSTAT" vectors expected for group tree exist among summary vectors
        _verify_that_sumvecs_exists(group_tree_df_model.wstat_vectors, self._all_vectors)

        # Get all vectors of interest existing in the summary data
        vectors_of_interest = group_tree_df_model.create_vector_of_interest_list()
        vectors_of_interest = [vec for vec in vectors_of_interest if vec in self._all_vectors]

        # Has any water injection or gas injection vectors among vectors of interest
        has_wi_vectors = False
        has_gi_vectors = False
        for vec in vectors_of_interest:
            if has_wi_vectors and has_gi_vectors:
                break
            if vec.startswith("WWIR") or vec.startswith("GWIR"):
                has_wi_vectors = True
            if vec.startswith("WGIR") or vec.startswith("GGIR"):
                has_gi_vectors = True

        # If any water or gas injection vectors exist, require field injection vectors exist
        if has_wi_vectors and "FWIR" not in vectors_of_interest:
            raise ValueError("Water injection vectors (WWIR/GWIR) found, but missing expected: FWIR")
        if has_gi_vectors and "FGIR" not in vectors_of_interest:
            raise ValueError("Gas injection vectors (WGIR/GGIR) found, but missing expected: FGIR")

        # Get summary vectors for all data simultaneously to obtain one request from Sumo
        # Many summary vectors might not be needed, but will be filtered out later on. This is the most efficient way to get the data
        # NOTE: "WSTAT" vectors are enumerated well state indicator, thus interpolated values might create issues (should be resolved by resampling-code)
        timer.lap_ms()
        single_realization_vectors_table, _ = await self._summary_access.get_single_real_vectors_table_async(
            vector_names=vectors_of_interest,
            resampling_frequency=self._summary_resampling_frequency,
            realization=self._realization,
        )
        get_summary_vectors_time_ms = timer.lap_ms()

        # Create list of column names in the table once (for performance)
        vectors_table_column_names = single_realization_vectors_table.column_names

        # Create well node classifications based on "WSTAT" vectors
        well_node_classifications: Dict[str, NodeClassification] = {}
        for wstat_vector in group_tree_df_model.wstat_vectors:
            well = wstat_vector.split(":")[1]
            well_states = set(single_realization_vectors_table[wstat_vector].to_pylist())
            well_node_classifications[well] = NodeClassification(
                IS_PROD=1.0 in well_states,
                IS_INJ=2.0 in well_states,
                IS_OTHER=(1.0 not in well_states) and (2.0 not in well_states),
            )

        # Create filtered group tree df from model
        timer.lap_ms()
        group_tree_df = group_tree_df_model.create_filtered_dataframe(
            terminal_node=self._terminal_node,
            excl_well_startswith=self._excl_well_startswith,
            excl_well_endswith=self._excl_well_endswith,
        )
        create_filtered_dataframe_time_ms = timer.lap_ms()

        # Create node classifications based on leaf node classifications
        node_classification_dict = _create_node_classification_dict(
            group_tree_df, well_node_classifications, single_realization_vectors_table
        )
        create_node_classifications_time_ms = timer.lap_ms()

        # Initialize injection states based on group tree data
        if self._terminal_node in node_classification_dict:
            is_inj_in_grouptree = node_classification_dict[self._terminal_node].IS_INJ
            if is_inj_in_grouptree and "FWIR" in vectors_table_column_names:
                self._has_waterinj = pc.sum(single_realization_vectors_table["FWIR"]).as_py() > 0
            if is_inj_in_grouptree and "FGIR" in vectors_table_column_names:
                self._has_gasinj = pc.sum(single_realization_vectors_table["FGIR"]).as_py() > 0

        # Get nodes with summary vectors and their metadata, and all summary vectors, and edge summary vectors
        # _node_sumvec_info_dict, all_sumvecs, edge_sumvecs =
        _group_tree_summary_vectors_info = _create_group_tree_summary_vectors_info(
            group_tree_df, node_classification_dict, self._terminal_node, self._has_waterinj, self._has_gasinj
        )
        create_group_tree_summary_vectors_info_tims_ms = timer.lap_ms()

        # Check if all edges is subset of initialized single realization vectors column names
        if not _group_tree_summary_vectors_info.edge_summary_vectors.issubset(vectors_table_column_names):
            missing_sumvecs = _group_tree_summary_vectors_info.edge_summary_vectors - set(vectors_table_column_names)
            raise ValueError(f"Missing summary vectors for edges in the GroupTree: {', '.join(missing_sumvecs)}.")

        # Expect all dictionaries to have the same keys
        if set(_group_tree_summary_vectors_info.node_summary_vectors_info_dict.keys()) != set(
            node_classification_dict.keys()
        ):
            raise ValueError("Node classifications and summary vector info must have the same keys.")

        # Create static working data for each node
        node_static_working_data_dict: Dict[str, StaticNodeWorkingData] = {}
        for node_name, node_classification in node_classification_dict.items():
            node_summary_vectors_info = _group_tree_summary_vectors_info.node_summary_vectors_info_dict[
                node_name
            ].SMRY_INFO
            node_static_working_data_dict[node_name] = StaticNodeWorkingData(
                node_name=node_name,
                node_classification=node_classification,
                node_summary_vectors_info=node_summary_vectors_info,
            )
        self._node_static_working_data_dict = node_static_working_data_dict

        # Expect each node to have working data
        node_names_set = set(group_tree_df["CHILD"].unique().tolist())
        if set(self._node_static_working_data_dict.keys()) != node_names_set:
            missing_node_working_data = node_names_set - set(self._node_static_working_data_dict.keys())
            raise ValueError(f"Missing static working data for nodes: {missing_node_working_data}")

        # Find group tree vectors existing in summary data
        valid_summary_vectors = [
            vec for vec in _group_tree_summary_vectors_info.all_summary_vectors if vec in vectors_table_column_names
        ]
        columns_of_interest = list(valid_summary_vectors) + ["DATE"]
        self._smry_table_sorted_by_date = single_realization_vectors_table.select(columns_of_interest).sort_by("DATE")

        # Assign group tree dataframe
        self._group_tree_df = group_tree_df

        # Log download from Sumo times
        LOGGER.info(
            f"Total time to fetch data from Sumo: {get_summary_vector_list_time_ms+get_summary_vectors_time_ms+get_group_tree_table_time_ms}ms, "
            f"Get summary vector list in: {get_summary_vector_list_time_ms}ms, "
            f"Get group tree table in: {get_group_tree_table_time_ms}ms, "
            f"Get summary vectors in: {get_summary_vectors_time_ms}ms"
        )

        # Log initialization of data structures times
        LOGGER.info(
            f"Initialize GroupTreeModel in: {initialize_grouptree_model_time_ms}ms, "
            f"Create filtered dataframe in: {create_filtered_dataframe_time_ms}ms, "
            f"Create node classifications in: {create_node_classifications_time_ms}ms, "
            f"Create group tree summary vectors info in: {create_group_tree_summary_vectors_info_tims_ms}ms"
        )

    async def create_dated_trees_and_metadata_lists(
        self,
    ) -> Tuple[List[DatedTree], List[GroupTreeMetadata], List[GroupTreeMetadata]]:
        """
        This method creates the dated trees and metadata lists for the single realization dataset.

        It does not create new data structures, but access the already fetched and initialized data for the single realization.
        Data structures are chosen and tested for optimized access and performance.
        """
        if self._tree_mode != TreeModeOptions.SINGLE_REAL:
            raise ValueError("Tree mode must be SINGLE_REAL to create a single realization dataset")

        if self._smry_table_sorted_by_date is None:
            raise ValueError("Summary dataframe sorted by date has not been initialized")

        if self._node_static_working_data_dict is None:
            raise ValueError("Static working data for nodes has not been initialized")

        dated_tree_list = _create_dated_trees(
            self._smry_table_sorted_by_date,
            self._group_tree_df,
            self._node_static_working_data_dict,
            self._node_types,
            self._terminal_node,
        )

        return (
            dated_tree_list,
            self._get_edge_options(self._node_types),
            [
                GroupTreeMetadata(key=datatype.value, label=_get_label(datatype))
                for datatype in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]
            ],
        )

    def _get_edge_options(self, node_types: set[NodeType]) -> List[GroupTreeMetadata]:
        """Returns a list with edge node options for the dropdown
        menu in the GroupTree component.

        The output list has the format:
        [
            {"name": DataType.OILRATE.value, "label": "Oil Rate"},
            {"name": DataType.GASRATE.value, "label": "Gas Rate"},
        ]
        """
        options: List[GroupTreeMetadata] = []
        if NodeType.PROD in node_types:
            for rate in [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]:
                options.append(GroupTreeMetadata(key=rate.value, label=_get_label(rate)))
        if NodeType.INJ in node_types and self._has_waterinj:
            options.append(GroupTreeMetadata(key=DataType.WATERINJRATE.value, label=_get_label(DataType.WATERINJRATE)))
        if NodeType.INJ in node_types and self._has_gasinj:
            options.append(GroupTreeMetadata(key=DataType.GASINJRATE.value, label=_get_label(DataType.GASINJRATE)))
        if options:
            return options
        return [GroupTreeMetadata(key=DataType.OILRATE.value, label=_get_label(DataType.OILRATE))]


def _create_group_tree_summary_vectors_info(
    group_tree_df: pd.DataFrame,
    node_classification_dict: Dict[str, NodeClassification],
    terminal_node: str,
    has_waterinj: bool,
    has_gasinj: bool,
) -> GroupTreeSummaryVectorsInfo:
    """
    Extract summary vector info from the provided group tree dataframe and node classifications.

    The group tree dataframe must have columns ["CHILD", "KEYWORD"]

    Returns a dataclass which holds summary vectors info for the group tree. A dictionary with node name as key,
    and all its summary vectors info as value. Also returns a set with all summary vectors present in the group tree,
    and a set with summary vectors used for edges in the group tree.

    Rates are not required for the terminal node since they will not be used.

    `Arguments`:
    group_tree_df: pd.DataFrame - Group tree dataframe. Expected columns are: ["CHILD", "KEYWORD"]
    node_classification_dict: Dict[str, NodeClassification] - Dictionary with node name as key, and classification as value
    terminal_node: str - Name of the terminal node in the group tree
    has_waterinj: bool - True if water injection is present in the group tree
    has_gasinj: bool - True if gas injection is present in the group tree

    `Returns`:
    GroupTreeSummaryVectorsInfo
    """
    node_sumvecs_info_dict: Dict[str, NodeSummaryVectorsInfo] = {}
    all_sumvecs: set[str] = set()
    edge_sumvecs: set[str] = set()

    unique_nodes = group_tree_df.drop_duplicates(subset=["CHILD", "KEYWORD"])

    node_names = unique_nodes["CHILD"].to_numpy()
    node_keyword = unique_nodes["KEYWORD"].to_numpy()

    if len(node_names) != len(node_keyword):
        raise ValueError("Length of node names and keywords must be equal.")

    if set(node_names) != set(node_classification_dict.keys()):
        missing_node_names = set(node_names) - set(node_classification_dict.keys())
        raise ValueError(f"Node names missing in node classification dict: {missing_node_names}")

    num_nodes = len(node_names)
    for i in range(num_nodes):
        nodename = node_names[i]
        keyword = node_keyword[i]
        node_classification = node_classification_dict[nodename]
        is_prod = node_classification.IS_PROD
        is_inj = node_classification.IS_INJ

        if not isinstance(nodename, str) or not isinstance(keyword, str):
            raise ValueError("Nodename and keyword must be strings")

        datatypes = [DataType.PRESSURE]
        if is_prod and nodename != terminal_node:
            datatypes += [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
        if is_inj and has_waterinj and nodename != terminal_node:
            datatypes.append(DataType.WATERINJRATE)
        if is_inj and has_gasinj and nodename != terminal_node:
            datatypes.append(DataType.GASINJRATE)
        if keyword == "WELSPECS":
            datatypes += [DataType.BHP, DataType.WMCTL]

        if len(datatypes) > 0:
            node_sumvecs_info_dict[nodename] = NodeSummaryVectorsInfo(SMRY_INFO={})

        for datatype in datatypes:
            sumvec_name = _create_sumvec_from_datatype_nodename_and_keyword(datatype, nodename, keyword)
            edge_or_node = _get_edge_node(datatype)
            all_sumvecs.add(sumvec_name)
            if edge_or_node == EdgeOrNode.EDGE:
                edge_sumvecs.add(sumvec_name)
            node_sumvecs_info_dict[nodename].SMRY_INFO[sumvec_name] = SummaryVectorInfo(
                DATATYPE=datatype, EDGE_NODE=edge_or_node
            )

    return GroupTreeSummaryVectorsInfo(
        node_summary_vectors_info_dict=node_sumvecs_info_dict,
        all_summary_vectors=all_sumvecs,
        edge_summary_vectors=edge_sumvecs,
    )


def _verify_that_sumvecs_exists(check_sumvecs: Sequence[str], valid_sumvecs: Sequence[str]) -> None:
    """
    Takes in a list of summary vectors and checks if they are present among the valid summary vectors.
    If any are missing, a ValueError is raised with the list of all missing summary vectors.
    """

    # Find vectors that are missing in the valid sumvecs
    missing_sumvecs = set(check_sumvecs) - set(valid_sumvecs)
    if len(missing_sumvecs) > 0:
        str_missing_sumvecs = ", ".join(missing_sumvecs)
        raise ValueError("Missing summary vectors for the GroupTree plugin: " f"{str_missing_sumvecs}.")


def _create_node_classification_dict(
    group_tree_df: pd.DataFrame,
    well_node_classifications: Dict[str, NodeClassification],
    summary_vectors_table: pa.Table,
) -> Dict[str, NodeClassification]:
    """
    Create dictionary with node name as key, and corresponding classification as value.

    The nodes are classified without considering the dates of the group trees. Thereby the classification
    is given across all dates.

    The states are found for the leaf nodes, and then the parent nodes are classified based on the leaf nodes. "Bottom-up" approach.

    Well leaf nodes are classified from the well_node_classifications dictionary. A group leaf node is defined by summary vectors
    for the node.

    `Arguments`:
    `group_tree_df: pd.DataFrame - Group tree df to modify. Expected columns: ["PARENT", "CHILD", "KEYWORD", "DATE"]
    `well_node_classifications: Dict[str, NodeClassification] - Dictionary with well node as key, and classification as value
    `summary_vectors_table: pa.Table - Summary table with all summary vectors. Needed to retrieve the classification for leaf nodes of type "GRUPTREE" or "BRANPROP"
    """

    # Get unique nodes, neglect dates
    nodes_df = group_tree_df.drop_duplicates(subset=["CHILD"], keep="first").copy()

    timer = PerfTimer()

    # Prepare arrays for node names, parent nodes and keywords
    node_parent_ndarray = nodes_df["PARENT"].to_numpy()
    node_name_ndarray = nodes_df["CHILD"].to_numpy()
    node_keyword_ndarray = nodes_df["KEYWORD"].to_numpy()

    if len(node_parent_ndarray) != len(node_name_ndarray) or len(node_name_ndarray) != len(node_keyword_ndarray):
        raise ValueError("Length of node names, parent names and keywords must be equal.")

    num_nodes = len(node_name_ndarray)

    # Build lists of leaf node, their keyword and parent node.
    leaf_node_list: List[str] = []
    leaf_node_keyword_list: List[str] = []
    leaf_node_parent_list: List[str] = []
    for i in range(num_nodes):
        node_name = node_name_ndarray[i]
        is_leaf_node = np.count_nonzero(node_parent_ndarray == node_name) == 0
        if is_leaf_node:
            leaf_node_list.append(node_name)
            leaf_node_keyword_list.append(node_keyword_ndarray[i])
            leaf_node_parent_list.append(node_parent_ndarray[i])

    if len(leaf_node_list) != len(leaf_node_keyword_list) or len(leaf_node_list) != len(leaf_node_parent_list):
        raise ValueError("Length of leaf node names, keyword and parent names must be equal.")

    is_leafnode_time_ms = timer.lap_ms()

    # Classify leaf nodes as producer, injector or other
    leaf_node_classification_map = _create_leaf_node_classification_map(
        leaf_node_list, leaf_node_keyword_list, well_node_classifications, summary_vectors_table
    )

    classifying_leafnodes_time_ms = timer.lap_ms()

    # Initial node classifications are leaf nodes
    node_classifications: Dict[str, NodeClassification] = leaf_node_classification_map

    # Build tree node classifications bottom up
    current_parent_nodes = set(leaf_node_parent_list)
    node_name_list: List[str] = node_name_ndarray.tolist()
    while len(current_parent_nodes) > 0:
        grandparent_nodes = set()

        # For each parent node, handle its children
        for parent_node in current_parent_nodes:
            if parent_node is None:
                continue

            children_indices = [index for index, value in enumerate(node_parent_ndarray) if value == parent_node]
            children_node_names = node_name_ndarray[children_indices]

            parent_node_classification = NodeClassification(IS_PROD=False, IS_INJ=False, IS_OTHER=False)
            children_classifications = [
                node_classifications[child] for child in children_node_names if child in node_classifications
            ]
            for child_classification in children_classifications:
                # Update parent node classification (or-logic)
                if child_classification.IS_PROD:
                    parent_node_classification.IS_PROD = True
                if child_classification.IS_INJ:
                    parent_node_classification.IS_INJ = True
                if child_classification.IS_OTHER:
                    parent_node_classification.IS_OTHER = True

                if (
                    parent_node_classification.IS_PROD
                    and parent_node_classification.IS_INJ
                    and parent_node_classification.IS_OTHER
                ):
                    break

            # Add parent node classification to the dict
            node_classifications[parent_node] = parent_node_classification

            # Add grandparent node to the set
            grandparent_node_index = node_name_list.index(parent_node)
            grandparent_node = node_parent_ndarray[grandparent_node_index]
            grandparent_nodes.add(grandparent_node)

        current_parent_nodes = grandparent_nodes

    # Expect the length of node classifications to be the same as the number of nodes
    if set(node_classifications.keys()) != set(node_name_list):
        missing_node_classifications = set(node_name_list) - set(node_classifications.keys())
        raise ValueError(f"Node classifications missing for nodes: {missing_node_classifications}")

    classify_remaining_nodes_time_ms = timer.lap_ms()

    LOGGER.info(
        f"Leaf node classification took: {is_leafnode_time_ms}ms, "
        f"Classifying leaf nodes took: {classifying_leafnodes_time_ms}ms, "
        f"Classify remaining nodes took: {classify_remaining_nodes_time_ms}ms "
        f"Total time add node type columns: {timer.elapsed_ms()}ms"
    )

    return node_classifications


def _create_leaf_node_classification_map(
    leaf_nodes: List[str],
    leaf_node_keywords: List[str],
    well_node_classifications: Dict[str, NodeClassification],
    summary_vectors_table: pa.Table,
) -> Dict[str, NodeClassification]:
    """Creates a dictionary with node names as keys and NodeClassification as values.

    The leaf nodes and keywords must be sorted and have the same length. I.e. pairwise by index.

    Well leaf nodes are classified from the well_node_classifications dictionary. A group leaf node is defined by summary vectors
    for the node.

    `Arguments`:
    - `leaf_nodes`: List[str] - List of leaf node names
    - `leaf_node_keywords`: List[str] - List of keywords for the leaf nodes
    - `well_node_classifications`: Dict[str, NodeClassification] - Dictionary with well node as key, and classification as value
    - `summary_vectors_table`: pa.Table - Summary table with all summary vectors. Needed to retrieve the classification for leaf nodes of type "GRUPTREE" or "BRANPROP"

    `Return`:
    Dict of leaf node name as key, and NodeClassification as value
    """
    if len(leaf_nodes) != len(leaf_node_keywords):
        raise ValueError("Length of node names and keywords must be equal.")

    summary_columns = summary_vectors_table.column_names

    leaf_node_classifications: Dict[str, NodeClassification] = {}
    for i, node in enumerate(leaf_nodes):
        well_node_classification = well_node_classifications.get(node)
        if leaf_node_keywords[i] == "WELSPECS" and well_node_classification is not None:
            leaf_node_classifications[node] = well_node_classification
        else:
            # For groups, classify based on summary vectors
            prod_sumvecs = [
                _create_sumvec_from_datatype_nodename_and_keyword(datatype, node, leaf_node_keywords[i])
                for datatype in [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
            ]
            inj_sumvecs = (
                [
                    _create_sumvec_from_datatype_nodename_and_keyword(datatype, node, leaf_node_keywords[i])
                    for datatype in [DataType.WATERINJRATE, DataType.GASINJRATE]
                ]
                if leaf_node_keywords[i] != "BRANPROP"
                else []
            )

            prod_sum = sum(
                pc.sum(summary_vectors_table[sumvec]).as_py() for sumvec in prod_sumvecs if sumvec in summary_columns
            )
            inj_sums = sum(
                pc.sum(summary_vectors_table[sumvec]).as_py() for sumvec in inj_sumvecs if sumvec in summary_columns
            )
            is_prod = prod_sum > 0
            is_inj = inj_sums > 0

            leaf_node_classifications[node] = NodeClassification(
                IS_PROD=is_prod, IS_INJ=is_inj, IS_OTHER=not is_prod and not is_inj
            )

    return leaf_node_classifications


def _get_label(datatype: DataType) -> str:
    """Returns a more readable label for the summary datatypes"""
    labels = {
        DataType.OILRATE: "Oil Rate",
        DataType.GASRATE: "Gas Rate",
        DataType.WATERRATE: "Water Rate",
        DataType.WATERINJRATE: "Water Inj Rate",
        DataType.GASINJRATE: "Gas Inj Rate",
        DataType.PRESSURE: "Pressure",
        DataType.BHP: "BHP",
        DataType.WMCTL: "WMCTL",
    }
    label = labels.get(datatype)
    if label is None:
        raise ValueError(f"Label for datatype {datatype.value} not implemented.")
    return label


def _get_edge_node(datatype: DataType) -> EdgeOrNode:
    """Returns if a given datatype is edge (typically rates) or node (f.ex pressures)"""
    if datatype in [
        DataType.OILRATE,
        DataType.GASRATE,
        DataType.WATERRATE,
        DataType.WATERINJRATE,
        DataType.GASINJRATE,
    ]:
        return EdgeOrNode.EDGE
    if datatype in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]:
        return EdgeOrNode.NODE
    raise ValueError(f"Data type {datatype.value} not implemented.")


def _create_sumvec_from_datatype_nodename_and_keyword(
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
        datatype_ecl = GROUP_TREE_FIELD_DATATYPE_TO_VECTOR_MAP[datatype]
        if datatype == "pressure":
            return f"{datatype_ecl}:{nodename}"
        return datatype_ecl
    try:
        if keyword == "WELSPECS":
            datatype_ecl = GROUPTREE_DATATYPE_TO_WELL_VECTOR_DATATYPE_MAP[datatype]
        else:
            datatype_ecl = TREE_TYPE_DATATYPE_TO_GROUP_VECTOR_DATATYPE_MAP[keyword][datatype]
    except KeyError as exc:
        error = (
            f"Summary vector not found for eclipse keyword: {keyword}, "
            f"data type: {datatype.value} and node name: {nodename}. "
        )
        raise KeyError(error) from exc
    return f"{datatype_ecl}:{nodename}"


def _create_dated_trees(
    smry_sorted_by_date: pa.Table,
    group_tree_df: pd.DataFrame,
    node_static_working_data_dict: Dict[str, StaticNodeWorkingData],
    valid_node_types: set[NodeType],
    terminal_node: str,
) -> List[DatedTree]:
    """
    Create a list of static group trees with summary data, based on the group trees and resampled summary data.

    The summary data should be valid for the time span of the group tree.

    The node structure for a dated tree in the list is static. The summary data for each node in the dated tree is given by
    by the time span where the tree is valid (from date of the tree to the next tree).

    `Arguments`:
    - `smry_sorted_by_date`. pa.Table - Summary data table sorted by date. Expected columns: [DATE, summary_vector_1, ... , summary_vector_n]
    - `group_tree_df`: Dataframe with group tree for dates - expected columns: [KEYWORD, CHILD, PARENT], optional column: [VFP_TABLE]
    - `node_static_working_data_dict`: Dictionary with node name as key and its static work data for building group trees
    - `valid_node_types`: Set of valid node types for the group tree
    - `terminal_node`: Name of the terminal node in the group tree

    `Returns`:
    A list of dated trees with recursive node structure and summary data for each node in the tree.
    """
    dated_trees: List[DatedTree] = []

    # loop trees
    timer = PerfTimer()

    # Group the group tree data by date
    grouptree_per_date = group_tree_df.groupby("DATE")
    grouptree_dates = group_tree_df["DATE"].unique()

    initial_grouping_and_dates_extract_time_ms = timer.lap_ms()

    # NOTE: What if resampling freq of gruptree data is higher than summary data?
    # A lot of "No summary data found for gruptree between {date} and {next_date}" is printed
    # Pick the latest group tree state or? Can a node change states prod/inj in between and details are
    timer.lap_ms()
    total_create_dated_trees_time_ms = 0
    total_smry_table_filtering_ms = 0
    total_find_next_date_time_ms = 0

    total_loop_time_ms_start = timer.elapsed_ms()
    for date, grouptree_at_date in grouptree_per_date:
        timer.lap_ms()
        next_date = grouptree_dates[grouptree_dates > date].min()
        if pd.isna(next_date):
            # Pick last smry date from sorted date column
            next_date = smry_sorted_by_date["DATE"][-1]
        total_find_next_date_time_ms += timer.lap_ms()

        timer.lap_ms()
        # Filter summary data for the time span defined by the group tree date and the next group tree date
        greater_equal_expr = pc.greater_equal(pc.field("DATE"), date)
        less_expr = pc.less(pc.field("DATE"), next_date)
        datespan_mask_expr = pc.and_kleene(greater_equal_expr, less_expr)

        smry_in_datespan_sorted_by_date: pa.Table = smry_sorted_by_date.filter(datespan_mask_expr)
        total_smry_table_filtering_ms += timer.lap_ms()

        if smry_in_datespan_sorted_by_date.num_rows > 0:
            dates = smry_in_datespan_sorted_by_date["DATE"]

            timer.lap_ms()
            dated_trees.append(
                DatedTree(
                    dates=[date.as_py().strftime("%Y-%m-%d") for date in dates],
                    tree=_create_dated_tree(
                        grouptree_at_date,
                        date,
                        smry_in_datespan_sorted_by_date,
                        len(dates),
                        node_static_working_data_dict,
                        valid_node_types,
                        terminal_node,
                    ),
                )
            )
            total_create_dated_trees_time_ms += timer.lap_ms()
        else:
            LOGGER.info(f"""No summary data found for gruptree between {date} and {next_date}""")

    total_loop_time_ms = timer.elapsed_ms() - total_loop_time_ms_start

    LOGGER.info(
        f"Total time create_dated_trees func: {timer.elapsed_ms()}ms, "
        f"Total loop time for grouptree_per_date: {total_loop_time_ms}ms, "
        f"Total filter smry table: {total_smry_table_filtering_ms}ms "
        f"Total create dated tree: {total_create_dated_trees_time_ms}ms "
    )

    return dated_trees


def _create_dated_tree(
    grouptree_at_date: pd.DataFrame,
    grouptree_date: pd.Timestamp,
    smry_for_grouptree_sorted_by_date: pa.Table,
    number_of_dates_in_smry: int,
    node_static_working_data_dict: Dict[str, StaticNodeWorkingData],
    valid_node_types: set[NodeType],
    terminal_node: str,
) -> TreeNode:
    """
    Create a static group tree with summary data for a set of dates.

    The node structure is static, but the summary data for each node is given for a set of dates.

    `Arguments`:
    - `grouptree_at_date`: Dataframe with group tree for one date - expected columns: [KEYWORD, CHILD, PARENT, EDGE_LABEL]
    - `grouptree_date`: Timestamp - Date of the group tree
    - smry_for_grouptree_sorted_by_date: Summary data for time span defined from the group tree at date to the next group tree date. The summary data is
    sorted by date, which implies unique dates, ordered by date. Thereby each node or edge is a column in the summary dataframe.
    - number_of_dates_in_smry: Number of unique dates in the summary data df. To be used for filling missing data - i.e. num rows of smry_sorted_by_date
    - node_static_working_data_dict: Dictionary with node name as key and its static work data for building group tree
    - valid_node_types: Set of valid node types for the group tree
    - terminal_node: Name of the terminal node in the group tree

    `Returns`:
    A dated tree with recursive node structure and summary data for each node for the set of dates.
    """
    # Dictionary of node name, with info about parent nodename RecursiveTreeNode with empty child array
    # I.e. iterate over rows in df (better than recursive search)
    nodes_dict: Dict[str, Tuple[str, TreeNode]] = {}

    # Extract columns as numpy arrays for index access resulting in faster processing
    # NOTE: Expect all columns to be 1D arrays and present in the dataframe
    node_names = grouptree_at_date["CHILD"].to_numpy()
    parent_names = grouptree_at_date["PARENT"].to_numpy()
    keywords = grouptree_at_date["KEYWORD"].to_numpy()

    if len(node_names) != len(parent_names) or len(node_names) != len(keywords):
        raise ValueError("Length of node_names, parent_names and keywords must be the same")

    # Create edge label for nodes
    edge_labels = [""] * len(node_names)
    if "VFP_TABLE" in grouptree_at_date.columns:
        edge_labels = _create_edge_label_list_from_vfp_table_column(grouptree_at_date["VFP_TABLE"])

    # Extract names once
    smry_columns_set = set(smry_for_grouptree_sorted_by_date.column_names)

    num_rows = len(node_names)
    # Iterate over every row in the grouptree dataframe to create the tree nodes
    for i in range(num_rows):
        node_name = node_names[i]
        parent_name = parent_names[i]
        if node_name not in nodes_dict:
            # Find working data for the node
            node_static_working_data = node_static_working_data_dict.get(node_name)
            if node_static_working_data is None:
                raise ValueError(f"No summary vector info found for node {node_name}")

            if not _is_valid_node_type(node_static_working_data.node_classification, valid_node_types):
                continue

            edge_data: Dict[str, List[float]] = {}
            node_data: Dict[str, List[float]] = {}

            # Each row in summary data is a unique date
            summary_vector_info = node_static_working_data.node_summary_vectors_info
            for sumvec, info in summary_vector_info.items():
                datatype = info.DATATYPE
                sumvec_name = sumvec
                if info.EDGE_NODE == EdgeOrNode.EDGE:
                    if sumvec_name in smry_columns_set:
                        edge_data[datatype] = smry_for_grouptree_sorted_by_date[sumvec_name].to_numpy().round(2)
                        continue
                    else:
                        edge_data[datatype] = list([np.nan] * number_of_dates_in_smry)
                        continue
                else:
                    if sumvec_name in smry_columns_set:
                        node_data[datatype] = smry_for_grouptree_sorted_by_date[sumvec_name].to_numpy().round(2)
                        continue
                    else:
                        node_data[datatype] = list([np.nan] * number_of_dates_in_smry)
                        continue

            node_type: Literal["Well", "Group"] = "Well" if keywords[i] == "WELSPECS" else "Group"
            edge_label = edge_labels[i]

            # children = [], and are added below after each node is created, to prevent recursive search
            nodes_dict[node_name] = (
                parent_name,
                TreeNode(
                    node_label=node_name,
                    node_type=node_type,
                    edge_label=edge_label,
                    edge_data=edge_data,
                    node_data=node_data,
                    children=[],
                ),
            )

    # Add children to the nodes, start with terminal node
    terminal_node_elm = nodes_dict.get(terminal_node)
    if terminal_node_elm is None:
        date_str = grouptree_date.strftime("%Y-%m-%d")
        raise ValueError(f"No terminal node {terminal_node} found in group tree at date {date_str}")

    # Iterate over the nodes dict and add children to the nodes by looking at the parent name
    # Operates by reference, so each node is updated in the dict
    for node_name, (parent_name, node) in nodes_dict.items():
        if parent_name in nodes_dict:
            nodes_dict[parent_name][1].children.append(node)

    # Terminal node is the dated tree
    result = nodes_dict[terminal_node][1]

    return result


def _is_valid_node_type(node_classification: NodeClassification, valid_node_types: set[NodeType]) -> bool:
    """Returns True if the node classification is a valid node type"""
    if node_classification.IS_PROD and NodeType.PROD in valid_node_types:
        return True
    if node_classification.IS_INJ and NodeType.INJ in valid_node_types:
        return True
    if node_classification.IS_OTHER and NodeType.OTHER in valid_node_types:
        return True
    return False


def _create_edge_label_list_from_vfp_table_column(vfp_table_column: pd.Series) -> list[str]:
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
