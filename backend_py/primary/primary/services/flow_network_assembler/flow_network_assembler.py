import logging
import asyncio
from typing import Optional, Tuple, Literal
from dataclasses import dataclass

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc

from fastapi import HTTPException
from webviz_pkg.core_utils.perf_timer import PerfTimer


from primary.services.sumo_access.summary_access import Frequency, SummaryAccess
from primary.services.sumo_access.group_tree_access import GroupTreeAccess
from primary.services.sumo_access.group_tree_types import TreeType

from . import _utils
from ._group_tree_dataframe_model import (
    GroupTreeDataframeModel,
)

from .flow_network_types import (
    DataType,
    DatedFlowNetwork,
    EdgeOrNode,
    FlowNetworkMetadata,
    FlowNetworkSummaryVectorsInfo,
    NetworkModeOptions,
    NetworkNode,
    NodeClassification,
    NodeSummaryVectorsInfo,
    NodeType,
    StaticNodeWorkingData,
    NetworkClassification,
)


LOGGER = logging.getLogger(__name__)


@dataclass
# Dataclass needs to save a bunch of timestamps. Many attributes is okay here, as splitting it would be more cumbersome
# pylint: disable-next=too-many-instance-attributes
class PerformanceTimes:
    """Simple utility class to store performance timer results for different internal method calls"""

    init_sumo_data: int = 0
    init_summary_vector_list: int = 0
    fetch_grouptree_df: int = 0
    init_grouptree_df_model: int = 0
    create_filtered_dataframe: int = 0
    init_summary_vector_data_table: int = 0
    create_node_classifications: int = 0
    create_network_summary_vectors_info: int = 0

    # Unused for logging for now, but available if needed
    build_and_verify_vectors_of_interest: int = 0
    create_well_node_classifications: int = 0

    def log_sumo_download_times(self) -> None:
        # Log download from Sumo times
        LOGGER.info(
            f"Total time to fetch data from Sumo: {self.init_sumo_data + self.init_summary_vector_data_table}ms, "
            f"Get summary vector list in: {self.init_summary_vector_list}ms, "
            f"Get group tree table in: {self.fetch_grouptree_df}ms, "
            f"Get summary vectors in: {self.init_summary_vector_data_table}ms"
        )

    def log_structure_init_times(self) -> None:
        # Log initialization of data structures times
        LOGGER.info(
            f"Initialize GroupTreeModel in: {self.init_grouptree_df_model}ms, "
            f"Create filtered dataframe in: {self.create_filtered_dataframe}ms, "
            f"Create node classifications in: {self.create_node_classifications}ms, "
            f"Create group tree summary vectors info in: {self.create_network_summary_vectors_info}ms"
        )


@dataclass
class FlatNetworkNodeData:
    """
    Utility class when assembling trees. A "flat" network node contains name of its parent node, and
    its node data which is a NetworkNode with a empty children array.
    """

    parent_name: str
    node_without_children: NetworkNode  # Should have an empty children array


# Should probably aim to reduce this, but that's out of scope for my current task, so leaving it as is. It was like this when I got here >:I
# pylint: disable-next=too-many-instance-attributes
class FlowNetworkAssembler:
    """
    Class to manage the fetching of data from sumo trees (GRUPTREE or BRANPROP) and vector summary
    tables, and assembling them together to create a collection of dated flow networks trees

    **Note: Currently, only the single realization (SINGLE_REAL) mode is supported**
    """

    # As before, fixing the arguments would be breaking, and out of scope for now. Leaving it as I found it
    # pylint: disable-next=too-many-arguments
    def __init__(
        self,
        group_tree_access: GroupTreeAccess,
        summary_access: SummaryAccess,
        realization: int,
        summary_frequency: Frequency,
        node_types: set[NodeType],
        flow_network_mode: NetworkModeOptions,
        terminal_node: str = "FIELD",
        tree_type: TreeType = TreeType.GRUPTREE,
        excl_well_startswith: Optional[list[str]] = None,
        excl_well_endswith: Optional[list[str]] = None,
    ):
        # NOTE: Temporary only supporting single real
        if flow_network_mode != NetworkModeOptions.SINGLE_REAL:
            raise ValueError("Only SINGLE_REAL mode is supported at the moment.")

        self._network_mode = flow_network_mode
        self._realization = realization
        self._group_tree_access = group_tree_access
        self._summary_access = summary_access
        self._tree_type = tree_type
        self._excl_well_startswith = excl_well_startswith
        self._excl_well_endswith = excl_well_endswith
        self._summary_resampling_frequency = summary_frequency
        self._node_types = node_types

        self._group_tree_df_model: Optional[GroupTreeDataframeModel] = None
        self._filtered_group_tree_df: Optional[pd.DataFrame] = None
        self._all_vectors: Optional[set[str]] = None
        self._smry_table_sorted_by_date: pa.Table | None = None

        self._node_static_working_data: dict[str, StaticNodeWorkingData] | None = None

        self._performance_times = PerformanceTimes()

        # Store network details in data class to make it easier to feed it to the various helpers
        self._network_classification = NetworkClassification(
            HAS_GAS_INJ=False, HAS_WATER_INJ=False, TERMINAL_NODE=terminal_node
        )

    def _verify_that_sumvecs_exists(self, check_sumvecs: set[str]) -> None:
        """
        Takes in a list of summary vectors and checks if they are present among the assemblers available vectors.
        If any are missing, a ValueError is raised with the list of all missing summary vectors.
        """
        # Find vectors that are missing in the valid sumvecs
        missing_sumvecs = check_sumvecs - self._all_vectors_safe
        if len(missing_sumvecs) > 0:
            str_missing_sumvecs = ", ".join(missing_sumvecs)
            raise ValueError("Missing summary vectors for the FlowNetwork plugin: ", f"{str_missing_sumvecs}.")

    async def _initialize_group_tree_df_async(self) -> None:
        """Get group tree data from Sumo, and store it in a helper model class"""
        timer = PerfTimer()

        group_tree_table_df = await self._group_tree_access.get_group_tree_table_for_realization(
            realization=self._realization
        )

        # Store performance time for later logging
        self._performance_times.fetch_grouptree_df = timer.lap_ms()

        if group_tree_table_df is None:
            raise HTTPException(status_code=404, detail="Group tree data not found")

        self._group_tree_df_model = GroupTreeDataframeModel(group_tree_table_df, self._tree_type)

        # Store performance time for later logging
        self._performance_times.init_grouptree_df_model = timer.lap_ms()

        # Create filtered group tree df from model
        self._filtered_group_tree_df = self._group_tree_df_model.create_filtered_dataframe(
            terminal_node=self._network_classification.TERMINAL_NODE,
            excl_well_startswith=self._excl_well_startswith,
            excl_well_endswith=self._excl_well_endswith,
        )

        # Store performance time for later logging
        self._performance_times.create_filtered_dataframe = timer.lap_ms()

    async def _initialize_all_vectors_list_async(self) -> None:
        timer = PerfTimer()

        vector_info_arr = await self._summary_access.get_available_vectors_async()
        self._all_vectors = {vec.name for vec in vector_info_arr}

        # Store performance time for later logging
        self._performance_times.init_summary_vector_list = timer.elapsed_ms()

    def _validate_assembler_config(self) -> None:
        if self._network_mode != NetworkModeOptions.SINGLE_REAL:
            raise ValueError("Network mode must be SINGLE_REAL to initialize single realization data")
        if self._realization is None:
            raise ValueError("FlowNetworkAssembler missing realization")

    @property
    def _group_tree_df_model_safe(self) -> GroupTreeDataframeModel:
        if self._group_tree_df_model is None:
            raise ValueError("Grouptree dataframe model has not been initialized")
        return self._group_tree_df_model

    @property
    def _all_vectors_safe(self) -> set[str]:
        if self._all_vectors is None:
            raise ValueError("List of summary vectors has not been initialized")
        return self._all_vectors

    @property
    def _filtered_group_tree_df_safe(self) -> pd.DataFrame:
        if self._filtered_group_tree_df is None:
            raise ValueError("Filtered group-tree dataframe has not been initialized")
        return self._filtered_group_tree_df

    async def fetch_and_initialize_async(self) -> None:
        """
        Fetches the group tree and summary data from Sumo, and initializes the data structures needed to build a single realization
        flow network.
        """
        timer = PerfTimer()
        self._performance_times = PerformanceTimes()
        self._validate_assembler_config()

        # Run data fetch + init concurrently
        await asyncio.gather(self._initialize_all_vectors_list_async(), self._initialize_group_tree_df_async())
        self._performance_times.init_sumo_data = timer.lap_ms()

        available_vectors = self._all_vectors_safe
        group_tree_df_model = self._group_tree_df_model_safe

        # Compute the well status vectors ("WSTAT") that we expect to be available
        tree_wstat_vectors = _utils.compute_tree_well_vectors(
            group_tree_df_model.group_tree_wells, DataType.WELL_STATUS
        )
        self._verify_that_sumvecs_exists(tree_wstat_vectors)

        vectors_of_interest = _utils.get_all_vectors_of_interest_for_tree(
            group_tree_df_model.group_tree_wells, group_tree_df_model.group_tree_groups
        )
        vectors_of_interest = vectors_of_interest & available_vectors

        self._verify_neccessary_injection_vectors(vectors_of_interest)
        self._performance_times.build_and_verify_vectors_of_interest = timer.lap_ms()

        # Get summary vectors for all data simultaneously to obtain one request from Sumo
        # Many summary vectors might not be needed, but will be filtered out later on. This is the most efficient way to get the data
        # NOTE: "WSTAT" vectors are enumerated well state indicator, thus interpolated values might create issues (should be resolved by resampling-code)
        single_realization_vectors_table, _ = await self._summary_access.get_single_real_vectors_table_async(
            vector_names=list(vectors_of_interest),
            resampling_frequency=self._summary_resampling_frequency,
            realization=self._realization,
        )
        self._performance_times.init_summary_vector_data_table = timer.lap_ms()

        # Create list of column names in the table once (for performance)
        vectors_table_column_names = single_realization_vectors_table.column_names
        node_classifications = self._create_node_classifications(tree_wstat_vectors, single_realization_vectors_table)

        # Initialize injection states based on group tree data
        self._init_injection_states(node_classifications, single_realization_vectors_table, vectors_table_column_names)

        # Get nodes with summary vectors and their metadata, and all summary vectors, and edge summary vectors
        network_summary_vectors_info = self._create_and_verify_network_summary_info(
            node_classifications, vectors_table_column_names
        )

        self._init_node_static_working_data(
            node_classifications, network_summary_vectors_info.node_summary_vectors_info_dict
        )
        self._init_sorted_summary_table(
            single_realization_vectors_table,
            vectors_table_column_names,
            network_summary_vectors_info.all_summary_vectors,
        )

        self._performance_times.log_sumo_download_times()
        self._performance_times.log_structure_init_times()

    async def create_dated_networks_and_metadata_lists(
        self,
    ) -> Tuple[list[DatedFlowNetwork], list[FlowNetworkMetadata], list[FlowNetworkMetadata]]:
        """
        This method creates date flow networks and metadata lists for a single realization dataset.

        It does not create new data structures, but access the already fetched and initialized data for the realization.
        Data structures are chosen and tested for optimized access and performance.
        """
        if self._network_mode != NetworkModeOptions.SINGLE_REAL:
            raise ValueError("Network mode must be SINGLE_REAL to create a single realization dataset")

        if self._smry_table_sorted_by_date is None:
            raise ValueError("Summary dataframe sorted by date has not been initialized")

        if self._node_static_working_data is None:
            raise ValueError("Static working data for nodes has not been initialized")

        dated_network_list = _create_dated_networks(
            self._smry_table_sorted_by_date,
            self._filtered_group_tree_df_safe,
            self._node_static_working_data,
            self._node_types,
            self._network_classification.TERMINAL_NODE,
        )

        return (
            dated_network_list,
            self._get_edge_options(self._node_types),
            [
                FlowNetworkMetadata(key=datatype.value, label=_utils.get_label_for_datatype(datatype))
                for datatype in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]
            ],
        )

    def _get_edge_options(self, node_types: set[NodeType]) -> list[FlowNetworkMetadata]:
        """Returns a list with edge node options for the dropdown
        menu in the Flow Network module.

        The output list has the format:
        [
            {"name": DataType.OILRATE.value, "label": "Oil Rate"},
            {"name": DataType.GASRATE.value, "label": "Gas Rate"},
        ]
        """
        options: list[FlowNetworkMetadata] = []
        if NodeType.PROD in node_types:
            for rate in [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]:
                options.append(FlowNetworkMetadata(key=rate.value, label=_utils.get_label_for_datatype(rate)))
        if NodeType.INJ in node_types and self._network_classification.HAS_WATER_INJ:
            options.append(
                FlowNetworkMetadata(
                    key=DataType.WATERINJRATE.value, label=_utils.get_label_for_datatype(DataType.WATERINJRATE)
                )
            )
        if NodeType.INJ in node_types and self._network_classification.HAS_GAS_INJ:
            options.append(
                FlowNetworkMetadata(
                    key=DataType.GASINJRATE.value, label=_utils.get_label_for_datatype(DataType.GASINJRATE)
                )
            )
        if options:
            return options
        return [FlowNetworkMetadata(key=DataType.OILRATE.value, label=_utils.get_label_for_datatype(DataType.OILRATE))]

    def _verify_neccessary_injection_vectors(self, vectors_of_interest: set[str]) -> None:
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

    def _create_node_classifications(
        self, wstat_vectors: set[str], vector_data_table: pa.Table
    ) -> dict[str, NodeClassification]:
        timer = PerfTimer()

        # Create well node classifications based on "WSTAT" vectors
        well_node_classifications: dict[str, NodeClassification] = {}
        for wstat_vector in wstat_vectors:
            well = wstat_vector.split(":")[1]
            well_states = set(vector_data_table[wstat_vector].to_pylist())
            well_node_classifications[well] = NodeClassification(
                IS_PROD=1.0 in well_states,
                IS_INJ=2.0 in well_states,
                IS_OTHER=(1.0 not in well_states) and (2.0 not in well_states),
            )

        self._performance_times.create_well_node_classifications = timer.elapsed_ms()

        # Create node classifications based on leaf node classifications
        node_classifications = _create_node_classification_dict(
            self._filtered_group_tree_df_safe, well_node_classifications, vector_data_table
        )
        self._performance_times.create_node_classifications = timer.lap_ms()

        return node_classifications

    def _init_injection_states(
        self,
        node_classifications: dict[str, NodeClassification],
        vector_table: pa.Table,
        vector_column_names: list[str],
    ) -> None:
        terminal_node_name = self._network_classification.TERMINAL_NODE

        if terminal_node_name in node_classifications:
            is_inj_in_grouptree = node_classifications[terminal_node_name].IS_INJ
            if is_inj_in_grouptree and "FWIR" in vector_column_names:
                self._network_classification.HAS_WATER_INJ = pc.sum(vector_table["FWIR"]).as_py() > 0

            if is_inj_in_grouptree and "FGIR" in vector_column_names:
                self._network_classification.HAS_GAS_INJ = pc.sum(vector_table["FGIR"]).as_py() > 0

    def _create_and_verify_network_summary_info(
        self,
        node_classifications: dict[str, NodeClassification],
        vector_column_names: list[str],
    ) -> FlowNetworkSummaryVectorsInfo:
        timer = PerfTimer()
        # Get nodes with summary vectors and their metadata, and all summary vectors, and edge summary vectors
        # _node_sumvec_info_dict, all_sumvecs, edge_sumvecs =
        network_summary_vectors_info = self._create_flow_network_summary_vectors_info(node_classifications)

        # Check if all edges is subset of initialized single realization vectors column names
        if not network_summary_vectors_info.edge_summary_vectors.issubset(vector_column_names):
            missing_sumvecs = network_summary_vectors_info.edge_summary_vectors - set(vector_column_names)
            raise ValueError(f"Missing summary vectors for edges in the flow network: {', '.join(missing_sumvecs)}.")

        # Expect all dictionaries to have the same keys
        if set(network_summary_vectors_info.node_summary_vectors_info_dict.keys()) != set(node_classifications.keys()):
            raise ValueError("Node classifications and summary vector info must have the same keys.")

        self._performance_times.create_network_summary_vectors_info = timer.elapsed_ms()

        return network_summary_vectors_info

    def _init_node_static_working_data(
        self,
        node_classifications: dict[str, NodeClassification],
        node_summary_vectors_info_dict: dict[str, NodeSummaryVectorsInfo],
    ) -> None:
        # Create static working data for each node
        filtered_group_tree_df = self._filtered_group_tree_df_safe
        node_static_working_data: dict[str, StaticNodeWorkingData] = {}

        for node_name, node_classification in node_classifications.items():
            node_summary_vectors_info = node_summary_vectors_info_dict[node_name].SMRY_INFO
            node_static_working_data[node_name] = StaticNodeWorkingData(
                node_name=node_name,
                node_classification=node_classification,
                node_summary_vectors_info=node_summary_vectors_info,
            )

        # Expect each node to have working data
        node_names_set = set(filtered_group_tree_df["CHILD"].unique().tolist())
        if set(node_static_working_data.keys()) != node_names_set:
            missing_node_working_data = node_names_set - set(node_static_working_data.keys())
            raise ValueError(f"Missing static working data for nodes: {missing_node_working_data}")

        self._node_static_working_data = node_static_working_data

    def _init_sorted_summary_table(
        self,
        vector_data_table: pa.Table,
        vector_column_names: list[str],
        all_summary_vectors: set[str],
    ) -> None:
        # Find group tree vectors existing in summary data
        valid_summary_vectors = [vec for vec in all_summary_vectors if vec in vector_column_names]

        columns_of_interest = list(valid_summary_vectors) + ["DATE"]
        self._smry_table_sorted_by_date = vector_data_table.select(columns_of_interest).sort_by("DATE")

    def _create_flow_network_summary_vectors_info(
        self, node_classification_dict: dict[str, NodeClassification]
    ) -> FlowNetworkSummaryVectorsInfo:
        """
        Extract summary vector info from the provided group tree dataframe and node classifications.

        The group tree dataframe must have columns ["CHILD", "KEYWORD"]

        Returns a dataclass which holds summary vectors info for the flow network. A dictionary with node name as key,
        and all its summary vectors info as value. Also returns a set with all summary vectors present in the network,
        and a set with summary vectors used for edges in the network.

        Rates are not required for the terminal node since they will not be used.

        `Arguments`:
        group_tree_df: pd.DataFrame - Group tree dataframe. Expected columns are: ["CHILD", "KEYWORD"]
        node_classification_dict: dict[str, NodeClassification] - Dictionary with node name as key, and classification as value
        terminal_node: str - Name of the terminal node in the group tree
        has_waterinj: bool - True if water injection is present in the group tree
        has_gasinj: bool - True if gas injection is present in the group tree

        `Returns`:
        FlowNetworkSummaryVectorsInfo
        """
        node_sumvecs_info_dict: dict[str, NodeSummaryVectorsInfo] = {}
        all_sumvecs: set[str] = set()
        edge_sumvecs: set[str] = set()

        group_tree_df_unique = self._filtered_group_tree_df_safe.drop_duplicates(subset=["CHILD", "KEYWORD"])

        node_names = group_tree_df_unique["CHILD"].to_numpy()
        node_keywords = group_tree_df_unique["KEYWORD"].to_numpy()

        for name, keyword in zip(node_names, node_keywords):
            (
                node_vectors_info,
                categorized_node_summary_vectors,
            ) = _utils.get_node_vectors_info_and_categorized_node_summary_vectors_from_name_and_keyword(
                name, keyword, node_classification_dict, self._network_classification
            )

            node_sumvecs_info_dict[name] = node_vectors_info
            all_sumvecs |= categorized_node_summary_vectors.all_summary_vectors
            edge_sumvecs |= categorized_node_summary_vectors.edge_summary_vectors

        return FlowNetworkSummaryVectorsInfo(
            node_summary_vectors_info_dict=node_sumvecs_info_dict,
            all_summary_vectors=all_sumvecs,
            edge_summary_vectors=edge_sumvecs,
        )


def _create_node_classification_dict(
    group_tree_df: pd.DataFrame,
    well_node_classifications: dict[str, NodeClassification],
    summary_vectors_table: pa.Table,
) -> dict[str, NodeClassification]:
    """
    Create dictionary with node name as key, and corresponding classification as value.

    The nodes are classified without considering the dates of the flow networks. Thereby the classification
    is given across all dates.

    The states are found for the leaf nodes, and then the parent nodes are classified based on the leaf nodes. "Bottom-up" approach.

    Well leaf nodes are classified from the well_node_classifications dictionary. A group leaf node is defined by summary vectors
    for the node.

    `Arguments`:
    `group_tree_df: pd.DataFrame - Group tree df to modify. Expected columns: ["PARENT", "CHILD", "KEYWORD", "DATE"]
    `well_node_classifications: dict[str, NodeClassification] - Dictionary with well node as key, and classification as value
    `summary_vectors_table: pa.Table - Summary table with all summary vectors. Needed to retrieve the classification for leaf nodes of type "GRUPTREE" or "BRANPROP"
    """

    # Get unique nodes, neglect dates
    nodes_df = group_tree_df.drop_duplicates(subset=["CHILD"], keep="first").copy()

    timer = PerfTimer()

    # Prepare arrays for node names, parent nodes and keywords
    node_parent_ndarray = nodes_df["PARENT"].to_numpy()
    node_name_ndarray = nodes_df["CHILD"].to_numpy()
    node_keyword_ndarray = nodes_df["KEYWORD"].to_numpy()

    # ? This check is uneccessary, no?
    if len(node_parent_ndarray) != len(node_name_ndarray) or len(node_name_ndarray) != len(node_keyword_ndarray):
        raise ValueError("Length of node names, parent names and keywords must be equal.")

    # Build lists of leaf node, their keyword and parent node.
    leaf_node_list: list[str] = []
    leaf_node_keyword_list: list[str] = []
    leaf_node_parent_list: list[str] = []

    for parent, node_name, keyword in zip(node_parent_ndarray, node_name_ndarray, node_keyword_ndarray):
        if not np.any(node_parent_ndarray == node_name):
            leaf_node_list.append(node_name)
            leaf_node_keyword_list.append(keyword)
            leaf_node_parent_list.append(parent)

    is_leafnode_time_ms = timer.lap_ms()

    # Classify leaf nodes as producer, injector or other
    leaf_node_classification_map = _create_leaf_node_classification_map(
        leaf_node_list, leaf_node_keyword_list, well_node_classifications, summary_vectors_table
    )

    classifying_leafnodes_time_ms = timer.lap_ms()

    node_classifications = _build_node_classifications_upwards(
        leaf_node_classification_map, leaf_node_parent_list, node_parent_ndarray, node_name_ndarray
    )

    classify_remaining_nodes_time_ms = timer.lap_ms()

    LOGGER.info(
        f"Leaf node classification took: {is_leafnode_time_ms}ms, "
        f"Classifying leaf nodes took: {classifying_leafnodes_time_ms}ms, "
        f"Classify remaining nodes took: {classify_remaining_nodes_time_ms}ms "
        f"Total time add node type columns: {timer.elapsed_ms()}ms"
    )

    return node_classifications


def _build_node_classifications_upwards(
    leaf_node_classification_map: dict[str, NodeClassification],
    leaf_node_parent_list: list[str],
    node_parent_ndarray: np.ndarray,
    node_name_ndarray: np.ndarray,
) -> dict[str, NodeClassification]:
    # Initial node classifications are leaf nodes
    node_classifications: dict[str, NodeClassification] = leaf_node_classification_map

    # Build network node classifications bottom up
    current_parent_nodes = set(leaf_node_parent_list)
    node_name_list: list[str] = node_name_ndarray.tolist()
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

    return node_classifications


def _create_leaf_node_classification_map(
    leaf_nodes: list[str],
    leaf_node_keywords: list[str],
    well_node_classifications: dict[str, NodeClassification],
    summary_vectors_table: pa.Table,
) -> dict[str, NodeClassification]:
    """Creates a dictionary with node names as keys and NodeClassification as values.

    The leaf nodes and keywords must be sorted and have the same length. I.e. pairwise by index.

    Well leaf nodes are classified from the well_node_classifications dictionary. A group leaf node is defined by summary vectors
    for the node.

    `Arguments`:
    - `leaf_nodes`: list[str] - List of leaf node names
    - `leaf_node_keywords`: list[str] - List of keywords for the leaf nodes
    - `well_node_classifications`: dict[str, NodeClassification] - Dictionary with well node as key, and classification as value
    - `summary_vectors_table`: pa.Table - Summary table with all summary vectors. Needed to retrieve the classification for leaf nodes of type "GRUPTREE" or "BRANPROP"

    `Return`:
    dict of leaf node name as key, and NodeClassification as value
    """
    if len(leaf_nodes) != len(leaf_node_keywords):
        raise ValueError("Length of node names and keywords must be equal.")

    summary_columns = summary_vectors_table.column_names

    leaf_node_classifications: dict[str, NodeClassification] = {}
    for i, node in enumerate(leaf_nodes):
        well_node_classification = well_node_classifications.get(node)
        if leaf_node_keywords[i] == "WELSPECS" and well_node_classification is not None:
            leaf_node_classifications[node] = well_node_classification
        else:
            # For groups, classify based on summary vectors
            prod_sumvecs = [
                _utils.create_sumvec_from_datatype_node_name_and_keyword(datatype, node, leaf_node_keywords[i])
                for datatype in [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
            ]
            inj_sumvecs = (
                [
                    _utils.create_sumvec_from_datatype_node_name_and_keyword(datatype, node, leaf_node_keywords[i])
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


# Many of the variables are just taken by performance timer laps as we compute, so the count is hard to reduce
# pylint: disable-next=too-many-locals
def _create_dated_networks(
    smry_sorted_by_date: pa.Table,
    group_tree_df: pd.DataFrame,
    node_static_working_data_dict: dict[str, StaticNodeWorkingData],
    valid_node_types: set[NodeType],
    terminal_node: str,
) -> list[DatedFlowNetwork]:
    """
    Create a list of static flow networks with summary data, based on the group trees and resampled summary data.

    The summary data should be valid for the time span of the network's summary data.

    The node structure for a dated network in the list is static. The summary data for each node in the dated network is given by
    the time span where the associated network is valid (from date of the network to the next network).

    `Arguments`:
    - `smry_sorted_by_date`. pa.Table - Summary data table sorted by date. Expected columns: [DATE, summary_vector_1, ... , summary_vector_n]
    - `group_tree_df`: Dataframe with group tree for dates - expected columns: [KEYWORD, CHILD, PARENT], optional column: [VFP_TABLE]
    - `node_static_working_data_dict`: Dictionary with node name as key and its static work data for building flow networks
    - `valid_node_types`: Set of node types to include from the group tree
    - `terminal_node`: Name of the terminal node in the group tree

    `Returns`:
    A list of dated networks with recursive node structure and summary data for each node in the tree.
    """
    dated_networks: list[DatedFlowNetwork] = []

    timer = PerfTimer()

    # Group the group tree data by date
    grouptree_per_date = group_tree_df.groupby("DATE")
    grouptree_dates = group_tree_df["DATE"].unique()

    timer.lap_ms()  # initial_grouping_and_dates_extract_time_ms

    # NOTE: What if resampling freq of gruptree data is higher than summary data?
    # A lot of "No summary data found for gruptree between {date} and {next_date}" is printed
    # Pick the latest group tree state or? Can a node change states prod/inj in between and details are
    total_create_dated_networks_time_ms = 0
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

            formatted_dates = [date.as_py().strftime("%Y-%m-%d") for date in dates]
            network = _create_dated_network(
                grouptree_at_date,
                date,
                smry_in_datespan_sorted_by_date,
                len(dates),
                node_static_working_data_dict,
                valid_node_types,
                terminal_node,
            )

            dated_networks.append(DatedFlowNetwork(dates=formatted_dates, network=network))
            total_create_dated_networks_time_ms += timer.lap_ms()
        else:
            LOGGER.info(f"""No summary data found for gruptree between {date} and {next_date}""")

    total_loop_time_ms = timer.elapsed_ms() - total_loop_time_ms_start

    LOGGER.info(
        f"Total time create_dated_networks func: {timer.elapsed_ms()}ms, "
        f"Total loop time for grouptree_per_date: {total_loop_time_ms}ms, "
        f"Total filter smry table: {total_smry_table_filtering_ms}ms "
        f"Total create dated network: {total_create_dated_networks_time_ms}ms "
    )

    return dated_networks


def _create_dated_network(
    grouptree_at_date: pd.DataFrame,
    grouptree_date: pd.Timestamp,
    smry_for_grouptree_sorted_by_date: pa.Table,
    number_of_dates_in_smry: int,
    node_static_working_data_dict: dict[str, StaticNodeWorkingData],
    valid_node_types: set[NodeType],
    terminal_node: str,
) -> NetworkNode:
    """
    Create a static flowm network with summary data for a set of dates.

    The node structure is static, but the summary data for each node is given for a set of dates.

    `Arguments`:
    - `grouptree_at_date`: Dataframe with group tree for one date - expected columns: [KEYWORD, CHILD, PARENT, EDGE_LABEL]
    - `grouptree_date`: Timestamp - Date of the group tree
    - smry_for_grouptree_sorted_by_date: Summary data for time span defined from the group tree at date to the next group tree date. The summary data is
    sorted by date, which implies unique dates, ordered by date. Thereby each node or edge is a column in the summary dataframe.
    - number_of_dates_in_smry: Number of unique dates in the summary data df. To be used for filling missing data - i.e. num rows of smry_sorted_by_date
    - node_static_working_data_dict: Dictionary with node name as key and its static work data for building networks
    - valid_node_types: Set of valid node types for the group tree
    - terminal_node: Name of the terminal node in the group tree

    `Returns`:
    A dated flow network with a recursive node structure, with summary data for the each date added to each node.
    """
    # Dictionary of node name, with info about parent nodename RecursiveTreeNode with empty child array
    # I.e. iterate over rows in df (better than recursive search)
    nodes_dict = _create_flat_network_nodes_map(
        grouptree_at_date,
        node_static_working_data_dict,
        valid_node_types,
        smry_for_grouptree_sorted_by_date,
        number_of_dates_in_smry,
    )

    terminal_node_elm = nodes_dict.get(terminal_node)

    if terminal_node_elm is None:
        date_str = grouptree_date.strftime("%Y-%m-%d")
        raise ValueError(f"No terminal node {terminal_node} found in group tree at date {date_str}")

    # Iterate over the nodes dict and add children to the nodes by looking at the parent name
    # Operates by reference, so each node is updated in the dict
    for _, flat_node_data in nodes_dict.items():
        parent_name = flat_node_data.parent_name
        if parent_name in nodes_dict:
            nodes_dict[parent_name].node_without_children.children.append(flat_node_data.node_without_children)

    # The terminal node is the final network
    result = nodes_dict[terminal_node].node_without_children

    return result


def _create_flat_network_nodes_map(
    grouptree_at_date: pd.DataFrame,
    node_static_working_data_dict: dict[str, StaticNodeWorkingData],
    valid_node_types: set[NodeType],
    smry_for_grouptree_sorted_by_date: pa.Table,
    number_of_dates_in_smry: int,
) -> dict[str, FlatNetworkNodeData]:
    """
    Creates a map with node names and their respective flat network node data.

    The network nodes are created flat, i.e. non-recursively. This implies nodes without children.
    Thereby the flat network node data contains info of parent node to assemble recursive structure
    after data fetching
    """
    nodes_dict: dict[str, FlatNetworkNodeData] = {}

    # Extract columns as numpy arrays for index access resulting in faster processing
    # NOTE: Expect all columns to be 1D arrays and present in the dataframe
    node_names = grouptree_at_date["CHILD"].to_numpy()
    parent_names = grouptree_at_date["PARENT"].to_numpy()
    keywords = grouptree_at_date["KEYWORD"].to_numpy()

    # Extract the names of all summary columns once
    smry_columns_set = set(smry_for_grouptree_sorted_by_date.column_names)

    # Create edge label for nodes
    edge_labels = [""] * len(node_names)
    if "VFP_TABLE" in grouptree_at_date.columns:
        edge_labels = _create_edge_label_list_from_vfp_table_column(grouptree_at_date["VFP_TABLE"])

    # Iterate over every row in the grouptree dataframe to create the network nodes
    for node_name, parent_name, node_keyword, edge_label in zip(node_names, parent_names, keywords, edge_labels):
        if node_name in nodes_dict:
            continue

        node_static_working_data = node_static_working_data_dict.get(node_name)
        if node_static_working_data is None:
            raise ValueError(f"No summary vector info found for node {node_name}")

        if not _is_valid_node_type(node_static_working_data.node_classification, valid_node_types):
            continue

        network_node = _create_network_node(
            node_name,
            node_keyword,
            edge_label,
            node_static_working_data,
            smry_columns_set,
            smry_for_grouptree_sorted_by_date,
            number_of_dates_in_smry,
        )

        nodes_dict[node_name] = FlatNetworkNodeData(parent_name=parent_name, node_without_children=network_node)

    return nodes_dict


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


def _create_network_node(
    node_name: str,
    keyword: str,
    edge_label: str,
    working_data: StaticNodeWorkingData,
    smry_columns_set: set,
    smry_for_grouptree_sorted_by_date: pa.Table,
    number_of_dates_in_smry: int,
) -> NetworkNode:
    # Find working data for the node

    node_type: Literal["Well", "Group"] = "Well" if keyword == "WELSPECS" else "Group"
    edge_data: dict[str, list[float]] = {}
    node_data: dict[str, list[float]] = {}

    # Array for vectors not existing in summary table
    nan_array = np.array([np.nan] * number_of_dates_in_smry)

    # Each row in summary data is a unique date
    summary_vector_info = working_data.node_summary_vectors_info
    for sumvec, info in summary_vector_info.items():
        datatype = info.DATATYPE

        if sumvec in smry_columns_set:
            data = smry_for_grouptree_sorted_by_date[sumvec].to_numpy().round(2)
        else:
            data = nan_array

        if info.EDGE_NODE == EdgeOrNode.EDGE:
            edge_data[datatype] = data
        else:
            node_data[datatype] = data

    # children = [], and are added below after each node is created, to prevent recursive search
    return NetworkNode(
        node_label=node_name,
        node_type=node_type,
        edge_label=edge_label,
        edge_data=edge_data,
        node_data=node_data,
        children=[],
    )
