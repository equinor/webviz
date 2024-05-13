import logging
from functools import reduce
from typing import Any, Dict, List, Optional, Tuple, TypedDict

import asyncio

import numpy as np
import pandas as pd
import pyarrow as pa
from fastapi import HTTPException
from primary.services.sumo_access.group_tree.group_tree_access import GroupTreeAccess
from primary.services.sumo_access.summary_access import Frequency, SummaryAccess

from .group_tree_types import (
    DataType,
    DatedTree,
    EdgeOrNode,
    GroupTreeMetadata,
    NodeType,
    RecursiveTreeNode,
    StatOptions,
    TreeModeOptions,
    TreeType,
)
from .group_tree_model import (
    GroupTreeModel,
    GROUP_TREE_FIELD_DATATYPE_TO_VECTOR_MAP,
    TREE_TYPE_DATATYPE_TO_GROUP_VECTOR_DATATYPE_MAP,
    GROUPTREE_DATATYPE_TO_WELL_VECTOR_DATATYPE_MAP,
)


import multiprocessing  # Slower for small cases, half the time for Smørbukk

from webviz_pkg.core_utils.perf_timer import PerfTimer

LOGGER = logging.getLogger(__name__)


#Typed dict for node sumvec info
class SumvecInfo(TypedDict):
    DATATYPE: DataType
    EDGE_NODE: EdgeOrNode
    SUMVEC: str

class NodeSumVecInfoDict(TypedDict):
    NODENAME: str
    SUM_VEC_INFO: List[SumvecInfo]

class GroupTreeAssembler:
    """
    Class to fetch group tree table data and summary data from access layers, and assemble
    the data into a format for the router layer.

    """

    def __init__(
        self,
        grouptree_access: GroupTreeAccess,
        summary_access: SummaryAccess,
        resampling_frequency: Frequency,
        realization: Optional[int] = None,
        terminal_node: str = "FIELD",
        tree_type: TreeType = TreeType.GRUPTREE,
        excl_well_startswith: Optional[List[str]] = None,
        excl_well_endswith: Optional[List[str]] = None,
    ):

        self._grouptree_access = grouptree_access
        self._summary_access = summary_access
        self._realization = realization
        self._terminal_node = terminal_node
        self._tree_type = tree_type
        self._excl_well_startswith = excl_well_startswith
        self._excl_well_endswith = excl_well_endswith
        self._resampling_frequency = resampling_frequency

        self._tree_mode: TreeModeOptions | None = None
        self._has_waterinj = False
        self._has_gasinj = False
        self._grouptree_df: pd.DataFrame | None = None
        self._grouptree_model: GroupTreeModel | None = None
        self._sumvecs_with_metadata: pd.DataFrame | None = None

        self._node_sumvec_info_dict: Dict[str, ]

        self._all_vectors: List[str] | None = None
        self._initialized_single_realization_vectors_table: pa.Table | None = None

    async def _fetch_vector_table_async(self, vector_name: str, resampling_frequency: Frequency) -> pa.Table:
        table, _ = await self._summary_access.get_vector_table_async(
            vector_name=vector_name,
            resampling_frequency=resampling_frequency,
            realizations=None,
        )
        return table

    async def _initialize_all_vectors_list_async(self) -> None:
        # NOTE: Retrieving all available vector names can be slow, could it be improved?
        # - Fetch names simultaneously as vector data? Will then get all data, so might not be good?
        vector_info_arr = await self._summary_access.get_available_vectors_async()
        self._all_vectors: List[str] = [vec.name for vec in vector_info_arr]

    async def _initialize_injection_states_async(self) -> None:
        # Initialize injection states based on summary data
        # Async for loop to fetch the vectors
        timer = PerfTimer()
        inj_vectors = ["FWIR", "FGIR"]
        is_inj_vectors_among_all = set(inj_vectors).issubset(self._all_vectors)
        if is_inj_vectors_among_all:
            # If there is injection in the tree we need to determine
            # which kind of injection. For that we need FWIR and FGIR
            self._check_that_sumvecs_exists(inj_vectors)
            smry = {}
            tasks = [self._fetch_vector_table_async(vec, self._resampling_frequency) for vec in inj_vectors]
            results = await asyncio.gather(*tasks)
            smry = {vec: table for vec, table in zip(inj_vectors, results)}

            self._has_waterinj = pa.compute.sum(smry["FWIR"]["FWIR"]).as_py() > 0
            self._has_gasinj = pa.compute.sum(smry["FGIR"]["FGIR"]).as_py() > 0

        et_water_gas_inj_info = timer.elapsed_ms()
        LOGGER.info(f"Water and gas injection info fetched in: {et_water_gas_inj_info}ms")

    async def initialize_single_realization_data_async(self, realization: int) -> None:
        self._realization = realization
        self._tree_mode = TreeModeOptions.SINGLE_REAL

        await self._initialize_all_vectors_list_async()
        if self._all_vectors is None:
            raise ValueError("List of summary vectors has not been initialized")

        # Get group tree data from Sumo
        grouptree_df = await self._grouptree_access.get_group_tree_table(realization=self._realization)
        if grouptree_df is None:
            raise HTTPException(status_code=404, detail="Group tree data not found")

        timer = PerfTimer()
        # Initialize model
        self._grouptree_model = GroupTreeModel(grouptree_df, self._tree_type)
        initialize_grouptree_model_time_ms = timer.lap_ms()

        # Check if all wstat vectors of interest exist among summary data
        self._check_that_sumvecs_exists(self._grouptree_model.wstat_vectors)

        # Get all vectors of interest existing in the summary data
        vectors_of_interest = self._grouptree_model.create_vector_of_interest_list()
        vectors_of_interest = [vec for vec in vectors_of_interest if vec in self._all_vectors]

        # Get summary vectors for all data simultaneously to obtain one request from Sumo
        vectors_table, _ = await self._summary_access.get_single_real_vectors_table_async(
            vector_names=vectors_of_interest,
            resampling_frequency=self._resampling_frequency,
            realization=self._realization,
        )
        self._initialized_single_realization_vectors_table = vectors_table

        wstat_unique = {
            well: pa.compute.unique(vectors_table[well]).to_pylist() for well in self._grouptree_model.wstat_vectors
        }

        # Create filtered group tree df from model
        timer.lap_ms()
        self._grouptree_df = self._grouptree_model.create_filtered_dataframe(
            terminal_node=self._terminal_node,
            excl_well_startswith=self._excl_well_startswith,
            excl_well_endswith=self._excl_well_endswith,
        )
        create_filtered_dataframe_time_ms = timer.lap_ms()

        # Add nodetypes IS_PROD, IS_INJ and IS_OTHER to gruptree
        self._grouptree_df = _add_nodetype_columns_to_df(
            self._grouptree_df, wstat_unique, self._grouptree_model.grouptree_wells, self._terminal_node
        )
        add_nodetype_columns_time_ms = timer.lap_ms()

        # Initialize injection states based on group tree data
        is_inj_in_grouptree = True in self._grouptree_df["IS_INJ"].unique()
        if is_inj_in_grouptree:
            await self._initialize_injection_states_async()

        # Add edge label
        # NOTE: SLOW as it is applied row-wise. Can it be improved?
        timer.lap_ms()
        self._grouptree_df["EDGE_LABEL"] = self._grouptree_df.apply(_get_edge_label, axis=1)
        add_edge_label_time_ms = timer.lap_ms()

        # Get summary data with metadata (nodename, datatype, edge_or_node)
        # Columns: NODENAME, DATATYPE, EDGE_NODE, SUMVEC
        self._sumvecs_with_metadata: pd.DataFrame = self._get_sumvecs_with_metadata()
        get_sumvecs_with_metadata_time_ms = timer.lap_ms()

        self._node_sumvec_info_dict = self._create_node_sumvecs_info_dict()

        # Check that all edge summary vectors exist
        all_edge_summary_vectors: List[str] = list(
            self._sumvecs_with_metadata[self._sumvecs_with_metadata["EDGE_NODE"] == EdgeOrNode.EDGE]["SUMVEC"]
        )
        self._check_that_sumvecs_exists(all_edge_summary_vectors)

        LOGGER.info(
            f"Initialize GroupTreeModel in: {initialize_grouptree_model_time_ms}ms "
            f"and create filtered dataframe in: {create_filtered_dataframe_time_ms}ms "
            f"and add nodetype columns in: {add_nodetype_columns_time_ms}ms "
            f"and add edge label in: {add_edge_label_time_ms}ms "
            f"and get sumvecs with metadata in: {get_sumvecs_with_metadata_time_ms}ms "
        )

    async def create_single_realization_group_tree_dataset(
        self,
        node_types: List[NodeType],
    ) -> Tuple[DatedTree, List[GroupTreeMetadata], List[GroupTreeMetadata]]:
        if self._tree_mode != TreeModeOptions.SINGLE_REAL:
            raise ValueError("Tree mode must be SINGLE_REAL to create a single realization dataset")

        if self._initialized_single_realization_vectors_table is None:
            raise ValueError("Singel realization vectors table has not been initialized")

        # Get vectors from initialized data, and retreive valid vectors
        vectors_df: pd.DataFrame = self._initialized_single_realization_vectors_table.to_pandas()

        # Get columns of
        valid_vectors: List[str] = [sumvec for sumvec in self._sumvecs_with_metadata["SUMVEC"] if sumvec in vectors_df.columns] + [
            "DATE"
        ]
        smry_df = vectors_df[valid_vectors]
        smry_df.sort_values("DATE")

        timer = PerfTimer()

        # Filter nodetype prod, inj and/or other
        dfs = []
        for tpe in node_types:
            dfs.append(self._grouptree_df[self._grouptree_df[f"IS_{tpe.value}".upper()]])
        gruptree_filtered = pd.concat(dfs).drop_duplicates()
        time_filter_node_types = timer.lap_ms()

        data_set = _create_dataset(smry_df, gruptree_filtered, self._sumvecs_with_metadata, self._node_sumvec_info_dict, self._terminal_node)

        time_create_dataset_ms = timer.lap_ms()

        LOGGER.info(
            f"Single realization dataset created in: {time_create_dataset_ms}ms "
            f"and node types filtered in: {time_filter_node_types}ms"
        )

        return (
            data_set,
            self._get_edge_options(node_types),
            [
                GroupTreeMetadata(key=datatype.value, label=_get_label(datatype))
                for datatype in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]
            ],
        )

    async def initialize_statistics_data_async(self) -> None:
        self._realization = None
        self._tree_mode = TreeModeOptions.STATISTICS

        await self._initialize_all_vectors_list_async()
        if self._all_vectors is None:
            raise ValueError("List of summary vectors has not been initialized")

        # **************************************
        #
        # Initialize data for statistics group tree
        #
        # **************************************

        grouptree_df = await self._grouptree_access.get_group_tree_table(realization=None)
        if grouptree_df is None:
            raise HTTPException(status_code=404, detail="Group tree data not found")

        self._grouptree_model = GroupTreeModel(grouptree_df, self._tree_type)
        self._grouptree_df = self._grouptree_model.create_filtered_dataframe(
            terminal_node=self._terminal_node,
            excl_well_startswith=self._excl_well_startswith,
            excl_well_endswith=self._excl_well_endswith,
        )

        group_tree_wells: List[str] = self._grouptree_df[self._grouptree_df["KEYWORD"] == "WELSPECS"]["CHILD"].unique()

        # Check that all WSTAT summary vectors exist
        # They are used to determine which summary vector are needed next.
        wstat_vecs = [f"WSTAT:{well}" for well in group_tree_wells]
        self._check_that_sumvecs_exists(wstat_vecs)

        # NOTE: This only retrieves WSTAT vectors for singel realization
        wstat_df, _ = await self._summary_access.get_single_real_vectors_table_async(
            vector_names=wstat_vecs,
            resampling_frequency=self._resampling_frequency,
            realization=(
                self._realization if self._realization is not None else min(self._summary_access.get_realizations())
            ),
        )

        wstat_unique = {well: pa.compute.unique(wstat_df[f"WSTAT:{well}"]).to_pylist() for well in group_tree_wells}

        # Add nodetypes IS_PROD, IS_INJ and IS_OTHER to gruptree
        self._grouptree_df = _add_nodetype_columns_to_df(
            self._grouptree_df, wstat_unique, group_tree_wells, self._terminal_node
        )

        # Initialize injection states based on group tree data
        await self._initialize_injection_states_async()

        # Add edge label
        self._grouptree_df["EDGE_LABEL"] = self._grouptree_df.apply(_get_edge_label, axis=1)

        # Get summary data with metadata (nodename, datatype, edge_or_node)
        self._sumvecs_with_metadata: pd.DataFrame = self._get_sumvecs_with_metadata()

        # Check that all edge summary vectors exist
        self._check_that_sumvecs_exists(list(self._sumvecs_with_metadata[self._sumvecs_with_metadata["EDGE_NODE"] == EdgeOrNode.EDGE]["SUMVEC"]))

    async def create_statistics_group_tree_dataset(
        self,
        stat_option: StatOptions,
        node_types: List[NodeType],
    ) -> Tuple[DatedTree, List[GroupTreeMetadata], List[GroupTreeMetadata]]:
        if self._tree_mode != TreeModeOptions.STATISTICS:
            raise ValueError("Tree mode must be STATISTICS to create a statistics dataset")

        if self._all_vectors is None:
            raise ValueError("List of summary vectors has not been initialized")

        vectors = [sumvec for sumvec in self._sumvecs_with_metadata["SUMVEC"] if sumvec in self._all_vectors]

        dfs = []
        tasks = [self._fetch_vector_table_async(vec, self._resampling_frequency) for vec in vectors]
        results = await asyncio.gather(*tasks)
        for table in results:
            dfs.append(table.to_pandas())

        smry = reduce(lambda left, right: pd.merge(left, right, on=["DATE", "REAL"]), dfs)

        if stat_option is StatOptions.MEAN:
            smry = smry.groupby("DATE").mean().reset_index()
        elif stat_option in [StatOptions.P50, StatOptions.P10, StatOptions.P90]:
            quantile = {StatOptions.P50.value: 0.5, StatOptions.P10.value: 0.9, StatOptions.P90.value: 0.1}[
                stat_option.value
            ]
            smry = smry.groupby("DATE").quantile(quantile).reset_index()
        elif stat_option is StatOptions.MAX:
            smry = smry.groupby("DATE").max().reset_index()
        elif stat_option is StatOptions.MIN:
            smry = smry.groupby("DATE").min().reset_index()
        else:
            raise ValueError(f"Statistical option: {stat_option.value} not implemented")

        # Filter nodetype prod, inj and/or other
        dfs = []
        for tpe in node_types:
            dfs.append(self._grouptree_df[self._grouptree_df[f"IS_{tpe.value}".upper()]])
        gruptree_filtered = pd.concat(dfs).drop_duplicates()

        return (
            _create_dataset(smry, gruptree_filtered, self._sumvecs_with_metadata, self._node_sumvec_info_dict, self._terminal_node),
            self._get_edge_options(node_types),
            [
                GroupTreeMetadata(key=datatype.value, label=_get_label(datatype))
                for datatype in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]
            ],
        )

    def _check_that_sumvecs_exists(self, check_sumvecs: List[str]) -> None:
        """Takes in a list of summary vectors and checks if they are
        present in the summary dataset. If any are missing, a ValueError
        is raised with the list of all missing summary vectors.
        """
        missing_sumvecs = [sumvec for sumvec in check_sumvecs if sumvec not in self._all_vectors]
        if missing_sumvecs:
            str_missing_sumvecs = ", ".join(missing_sumvecs)
            raise ValueError("Missing summary vectors for the GroupTree plugin: " f"{str_missing_sumvecs}.")


    def _create_node_sumvecs_info_dict(
        self,
    ) -> Dict[str, Dict[str,Any]]:
        """Returns a dataframe with the summary vectors that is needed to
        put together the group tree dataset.

        Rates are not required for the terminal node since they will not be used.

        The other columns are metadata:

        * nodename: name in eclipse network
        * datatype: oilrate, gasrate, pressure etc
        * edge_node: whether the datatype is edge (f.ex rates) or node (f.ex pressure)

        The output dataframe has the format:
        Columns: [NODENAME, DATATYPE, EDGE_NODE, SUMVEC]

           NODENAME           DATATYPE        EDGE_NODE      SUMVEC
        0     FIELD  DataType.PRESSURE  EdgeOrNode.NODE   GPR:FIELD
        1        OP  DataType.PRESSURE  EdgeOrNode.NODE      GPR:OP
        2       RFT  DataType.PRESSURE  EdgeOrNode.NODE     GPR:RFT

        """
        node_sumvecs_info_dict = {}
            
        unique_nodes = self._grouptree_df.drop_duplicates(subset=["CHILD", "KEYWORD"])
        for _, noderow in unique_nodes.iterrows():
            nodename = noderow["CHILD"]
            keyword = noderow["KEYWORD"]

            datatypes = [DataType.PRESSURE]
            if noderow["IS_PROD"] and nodename != self._terminal_node:
                datatypes += [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
            if noderow["IS_INJ"] and self._has_waterinj and nodename != self._terminal_node:
                datatypes.append(DataType.WATERINJRATE)
            if noderow["IS_INJ"] and self._has_gasinj and nodename != self._terminal_node:
                datatypes.append(DataType.GASINJRATE)
            if keyword == "WELSPECS":
                datatypes += [DataType.BHP, DataType.WMCTL]

            if len(datatypes)> 0:
                node_sumvecs_info_dict[nodename] = {}

            for datatype in datatypes:
                sumvec_name =  _get_sumvec(datatype, nodename, keyword)
                node_sumvecs_info_dict[nodename][sumvec_name] = {
                    "DATATYPE": datatype,
                    "EDGE_NODE": _get_edge_node(datatype)
                }

        return node_sumvecs_info_dict

    def _get_sumvecs_with_metadata(
        self,
    ) -> pd.DataFrame:
        """Returns a dataframe with the summary vectors that is needed to
        put together the group tree dataset.

        Rates are not required for the terminal node since they will not be used.

        The other columns are metadata:

        * nodename: name in eclipse network
        * datatype: oilrate, gasrate, pressure etc
        * edge_node: whether the datatype is edge (f.ex rates) or node (f.ex pressure)

        The output dataframe has the format:
        Columns: [NODENAME, DATATYPE, EDGE_NODE, SUMVEC]

           NODENAME           DATATYPE        EDGE_NODE      SUMVEC
        0     FIELD  DataType.PRESSURE  EdgeOrNode.NODE   GPR:FIELD
        1        OP  DataType.PRESSURE  EdgeOrNode.NODE      GPR:OP
        2       RFT  DataType.PRESSURE  EdgeOrNode.NODE     GPR:RFT

        """
        records = []
            
        unique_nodes = self._grouptree_df.drop_duplicates(subset=["CHILD", "KEYWORD"])
        for _, noderow in unique_nodes.iterrows():
            nodename = noderow["CHILD"]
            keyword = noderow["KEYWORD"]

            datatypes = [DataType.PRESSURE]
            if noderow["IS_PROD"] and nodename != self._terminal_node:
                datatypes += [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
            if noderow["IS_INJ"] and self._has_waterinj and nodename != self._terminal_node:
                datatypes.append(DataType.WATERINJRATE)
            if noderow["IS_INJ"] and self._has_gasinj and nodename != self._terminal_node:
                datatypes.append(DataType.GASINJRATE)
            if keyword == "WELSPECS":
                datatypes += [DataType.BHP, DataType.WMCTL]

            for datatype in datatypes:
                records.append(
                    {
                        "NODENAME": nodename,
                        "DATATYPE": datatype,
                        "EDGE_NODE": _get_edge_node(datatype),
                        "SUMVEC": _get_sumvec(datatype, nodename, keyword),
                    }
                )
        return pd.DataFrame(records)

    def _get_edge_options(self, node_types: List[NodeType]) -> List[GroupTreeMetadata]:
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


def _add_nodetype_columns_to_df(
    gruptree: pd.DataFrame,
    wstat_unique: Dict[str, List[int]],
    all_wells: List[str],
    terminal_node: str,
) -> pd.DataFrame:
    """Adds nodetype columns IS_PROD, IS_INJ and IS_OTHER to the provided group tree dataframe."""

    # Get all nodes
    nodes = gruptree.drop_duplicates(subset=["CHILD"], keep="first").copy()

    # Identify leaf nodes (group nodes can also be leaf nodes)
    def is_leafnode(node: pd.Series) -> bool:
        if nodes[nodes["PARENT"] == node["CHILD"]].empty:
            return True
        return False

    nodes["IS_LEAF"] = nodes.apply(is_leafnode, axis=1)

    # Classify leaf nodes as producer, injector or other
    is_prod_map, is_inj_map, is_other_map = _create_leafnodetype_maps(nodes[nodes["IS_LEAF"]], wstat_unique, all_wells)
    nodes["IS_PROD"] = nodes["CHILD"].map(is_prod_map)
    nodes["IS_INJ"] = nodes["CHILD"].map(is_inj_map)
    nodes["IS_OTHER"] = nodes["CHILD"].map(is_other_map)

    # Recursively find well types of all leaf nodes connected to the group node
    # Deduce group node type from well types
    nonleafs = nodes[~nodes["IS_LEAF"]]
    for _, node in nonleafs.iterrows():
        leafs_are_prod, leafs_are_inj, leafs_are_other = _get_leafnode_types(node["CHILD"], nodes)
        is_prod_map[node["CHILD"]] = any(leafs_are_prod)
        is_inj_map[node["CHILD"]] = any(leafs_are_inj)
        is_other_map[node["CHILD"]] = any(leafs_are_other)

    # The terminal node must not be filtered out,
    # so it is set True for all categories
    is_prod_map[terminal_node] = True
    is_inj_map[terminal_node] = True
    is_other_map[terminal_node] = True

    # Tag all nodes as IS_PROD, IS_INJ and IS_OTHER
    gruptree["IS_PROD"] = gruptree["CHILD"].map(is_prod_map)
    gruptree["IS_INJ"] = gruptree["CHILD"].map(is_inj_map)
    gruptree["IS_OTHER"] = gruptree["CHILD"].map(is_other_map)
    return gruptree


def _create_leafnodetype_maps(
    leafnodes: pd.DataFrame, wstat_unique: Dict[str, List[int]], __all_wells: List[str]
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """Returns three dictionaries classifying leaf nodes as producer,
    injector and/or other (f.ex observation well).

    Well leaf nodes are classified using WSTAT and group leaf nodes
    are classified using summary data.
    """
    # pylint: disable=too-many-locals
    is_prod_map, is_inj_map, is_other_map = {}, {}, {}
    # wstat_df = pd.DataFrame()  # provider.get_vectors_df([f"WSTAT:{well}" for well in all_wells], None)

    for _, leafnode in leafnodes.iterrows():
        nodename = leafnode["CHILD"]
        nodekeyword = leafnode["KEYWORD"]

        if nodekeyword == "WELSPECS" and wstat_unique.get(nodename) is not None:
            # The leaf node is a well
            wstat = wstat_unique[nodename]
            is_prod_map[nodename] = 1 in wstat
            is_inj_map[nodename] = 2 in wstat
            is_other_map[nodename] = (1 not in wstat) and (2 not in wstat)
        else:
            # The leaf node is a group
            prod_sumvecs = [
                _get_sumvec(datatype, nodename, nodekeyword)
                for datatype in [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]
            ]
            inj_sumvecs = (
                [
                    _get_sumvec(datatype, nodename, nodekeyword)
                    for datatype in [DataType.WATERINJRATE, DataType.GASINJRATE]
                ]
                if nodekeyword != "BRANPROP"
                else []
            )

            # TODO: SHOULD NOT BE AN EMPTY DATAFRAME?
            smry = pd.DataFrame()

            # smry = provider.get_vectors_df(
            #     [
            #         sumvec
            #         for sumvec in (prod_sumvecs + inj_sumvecs)
            #         if sumvec in provider.vector_names()
            #     ],
            #     None,
            # )

            sumprod = sum(smry[sumvec].sum() for sumvec in prod_sumvecs if sumvec in smry.columns)
            suminj = sum(smry[sumvec].sum() for sumvec in inj_sumvecs if sumvec in smry.columns)

            is_prod_map[nodename] = sumprod > 0
            is_inj_map[nodename] = suminj > 0
            is_other_map[nodename] = (sumprod == 0) and (suminj == 0)
    return is_prod_map, is_inj_map, is_other_map


def _get_leafnode_types(node_name: str, gruptree: pd.DataFrame) -> Tuple[List[Any], List[Any], List[Any]]:
    """This function finds the IS_PROD, IS_INJ and IS_OTHER values of all
    leaf nodes connected to the input node.

    The function is using recursion to find all wells below the node
    int the three.
    """
    children = gruptree[gruptree["PARENT"] == node_name]
    leafs_are_prod, leafs_are_inj, leafs_are_other = [], [], []
    for _, childrow in children.iterrows():
        if childrow["IS_LEAF"]:
            leafs_are_prod.append(childrow["IS_PROD"])
            leafs_are_inj.append(childrow["IS_INJ"])
            leafs_are_other.append(childrow["IS_OTHER"])
        else:
            prod, inj, other = _get_leafnode_types(childrow["CHILD"], gruptree)
            leafs_are_prod += prod
            leafs_are_inj += inj
            leafs_are_other += other
    return leafs_are_prod, leafs_are_inj, leafs_are_other


def _get_edge_label(row: pd.Series) -> str:
    """Returns the edge label for a row in the grouptree dataframe"""
    if "VFP_TABLE" not in row or row["VFP_TABLE"] in [None, 9999] or np.isnan(row["VFP_TABLE"]):
        return ""
    vfp_nb = int(row["VFP_TABLE"])
    return f"VFP {vfp_nb}"


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


def _get_sumvec(
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


def _process_tree_extraction_per_date(gruptree_at_date, terminal_node, smry_grouped_by_date, dates, sumvecs):
    # Process each date here
    # Example: return result for each date
    return DatedTree(
        dates=[date.strftime("%Y-%m-%d") for date in dates],
        tree=_extract_tree(gruptree_at_date, terminal_node, smry_grouped_by_date, dates, sumvecs),
    )


# def _create_dataset(
#     smry: pd.DataFrame,
#     gruptree: pd.DataFrame,
#     sumvecs: pd.DataFrame,
#     terminal_node: str,
# ) -> List[DatedTree]:
#     """The function puts together the GroupTree component input dataset.

#     The gruptree dataframe includes complete networks for every time
#     the tree changes (f.ex if a new well is defined). The function loops
#     through the trees and puts together all the summary data that is valid for
#     the time span where the tree is valid, along with the tree structure itself.
#     """
#     dated_trees: List[DatedTree] = []

#     # loop trees
#     total_extract_tree_time_ms = 0
#     timer = PerfTimer()

#     # smry_grouped_by_date = smry.groupby("DATE")
#     gruptree_grouped_by_date = gruptree.groupby("DATE")
#     gruptree_dates = gruptree["DATE"].unique()

#     # Process each date concurrently
#     with multiprocessing.Pool() as pool:
#         results = []

#         for date, gruptree_at_date in gruptree_grouped_by_date:
#             next_date = gruptree_dates[gruptree_dates > date].min()
#             if pd.isna(next_date):
#                 next_date = smry["DATE"].max()
#                 # next_date = date

#             # Group summary data by date: Dict[date, DataFrame]
#             smry_grouped_by_date = smry[(smry["DATE"] >= date) & (smry["DATE"] < next_date)].groupby("DATE")
#             dates = list(smry_grouped_by_date.groups.keys())

#             if len(dates) > 0:
#                 results.append(pool.apply_async(_process_tree_extraction_per_date, args=(gruptree_at_date, terminal_node,
#                                                                 smry_grouped_by_date, dates, sumvecs)))
#             # else:
#             #     LOGGER.info(f"""No summary data found for gruptree between {date} and {next_date}""")

#         # Get results from futures
#         dated_trees = [result.get() for result in results]

#     total_extract_tree_time_ms = timer.lap_ms()

#     LOGGER.info(f"Total time create dataset: {timer.elapsed_ms()}ms "
#                 f"Total time extrac tree: {total_extract_tree_time_ms}ms ")

#     return dated_trees


def _create_dataset(
    smry_sorted_by_date: pd.DataFrame,
    gruptree: pd.DataFrame,
    sumvecs_with_metadata: pd.DataFrame,
    node_sumvec_info_dict: dict,
    terminal_node: str,
) -> List[DatedTree]:
    """The function puts together the GroupTree component input dataset.

    The gruptree dataframe includes complete networks for every time
    the tree changes (f.ex if a new well is defined). The function loops
    through the trees and puts together all the summary data that is valid for
    the time span where the tree is valid, along with the tree structure itself.
    """
    dated_trees: List[DatedTree] = []

    # loop trees
    total_extract_tree_time_ms = 0
    timer = PerfTimer()

    # smry_grouped_by_date = smry.groupby("DATE")
    gruptree_grouped_by_date = gruptree.groupby("DATE")
    gruptree_grouped_by_date_time_ms = timer.lap_ms()

    gruptree_dates = gruptree["DATE"].unique()

    # NOTE: What if resampling freq of gruptree data is higher than summary data?
    # A lot of "No summary data found for gruptree between {date} and {next_date}" is printed
    # Pick the latest grup tree state or? Can a node change states prod/inj in between and details are
    for date, gruptree_at_date in gruptree_grouped_by_date:
        next_date = gruptree_dates[gruptree_dates > date].min()
        if pd.isna(next_date):
            # Pick last smry date fro sorted date column
            next_date = smry_sorted_by_date["DATE"].max()
            
        smry_in_datespan_sorted_by_date = smry_sorted_by_date[(smry_sorted_by_date["DATE"] >= date) & (smry_sorted_by_date["DATE"] < next_date)]

        if smry_in_datespan_sorted_by_date.shape[0] > 0:
            # Group summary data by date: Dict[date, DataFrame]
            # smry_grouped_by_date = smry_in_datespan_sorted_by_date.groupby("DATE")
            dates = smry_in_datespan_sorted_by_date["DATE"].unique()  # datetime64[ns] -> Timestamp done by pandas

            start_extract_time_ms = timer.lap_ms()
            dated_trees.append(
                DatedTree(
                    dates=[date.strftime("%Y-%m-%d") for date in dates],
                    tree=_extract_tree(gruptree_at_date, smry_in_datespan_sorted_by_date, len(dates), node_sumvec_info_dict, terminal_node),
                )
            )
            end_extract_time_ms = timer.lap_ms()
            total_extract_tree_time_ms += end_extract_time_ms - start_extract_time_ms
        else:
            LOGGER.info(f"""No summary data found for gruptree between {date} and {next_date}""")

    LOGGER.info(
        f"Total time create dataset: {timer.elapsed_ms()}ms "
        f"Time gruptree group by date: {gruptree_grouped_by_date_time_ms}ms "
        f"Total time extrac tree: {total_extract_tree_time_ms}ms "
    )

    return dated_trees


def _extract_tree(
    gruptree_at_date: pd.DataFrame,
    smry_sorted_by_date: pd.DataFrame,
    number_of_dates: int,
    node_sumvec_info_dict: Dict[str, dict],
    nodename: str
) -> RecursiveTreeNode:
    """Extract the tree part of the GroupTree component dataset. This functions
    works recursively and is initially called with the terminal node of the tree
    (usually FIELD)

    The algorithm start with the initial node, and continues with the children of the nodes recursively.

    - gruptree_at_date: Dataframe with group tree for one date
    - smry_sorted_by_date: Summary data for time span defined from the group tree date to the next group tree date. The summary data is
    sorted by date, which implies unique dates, ordered by date. Thereby each node or edge is a column in the summary dataframe.
    - nodename: Name of the current node in tree
    - sumvecs: Dataframe containing summary vector names with metadata (nodename, datatype, edge_or_node)
    """
    # pylint: disable=too-many-locals

    # Find summary vectors for the current node
    node_sumvec_info = node_sumvec_info_dict.get(nodename)
    if(node_sumvec_info is None):
        raise ValueError(f"No summary vector info found for node {nodename}")

    # node_sumvecs = sumvecs[sumvecs["NODENAME"] == nodename]
    # if node_sumvecs.empty:
    #     raise ValueError(f"No summary vectors found for node {nodename}")
    
    # edge_datatypes = node_sumvecs[node_sumvecs["EDGE_NODE"] == EdgeOrNode.EDGE].to_dict("records")
    # node_datatypes = node_sumvecs[node_sumvecs["EDGE_NODE"] == EdgeOrNode.NODE].to_dict("records")

  

    edge_data: Dict[str, List[float]] = {}
    node_data: Dict[str, List[float]] = {}
    
    node_type, edge_label = _get_node_type_and_edge_label(gruptree_at_date, nodename)
    # node_type = "Well"
    # edge_label = ""

    # for edge in edge_datatypes:
    #     edge_datatype = edge["DATATYPE"]
    #     edge_vector_name = edge["SUMVEC"]
    #     if edge_vector_name not in smry_sorted_by_date.columns:
    #         edge_data[edge_datatype] = list([np.nan] * num_dates)
    #     else:
    #         edge_data[edge_datatype] = smry_sorted_by_date[edge_vector_name].round(2).to_list()
    
    # for node in node_datatypes:
    #     node_datatype = node["DATATYPE"]
    #     node_vector_name = node["SUMVEC"]
    #     if node_vector_name not in smry_sorted_by_date.columns:
    #         node_data[node_datatype] = list([np.nan] * num_dates)
    #     else:
    #         node_data[node_datatype] = smry_sorted_by_date[node_vector_name].round(2).to_list()

    # Each row is a unique date
    for (sumvec, info) in node_sumvec_info.items():
        datatype = info["DATATYPE"]
        sumvec_name = sumvec
        if info["EDGE_NODE"] == EdgeOrNode.EDGE:
            if sumvec_name not in smry_sorted_by_date.columns:
                edge_data[datatype] = list([np.nan] * number_of_dates)
            else:
                edge_data[datatype] = smry_sorted_by_date[sumvec_name].round(2).to_list()
        else:
            if sumvec_name not in smry_sorted_by_date.columns:
                node_data[datatype] = list([np.nan] * number_of_dates)
            else:
                node_data[datatype] = smry_sorted_by_date[sumvec_name].round(2).to_list()            

    child_names = list(gruptree_at_date[gruptree_at_date["PARENT"] == nodename]["CHILD"].unique())

    result = RecursiveTreeNode(
        node_label=nodename,
        node_type=node_type,
        edge_label=edge_label,
        edge_data=edge_data,
        node_data=node_data,
        children=[
            # _extract_tree(gruptree_at_date, smry_sorted_by_date, child_name, sumvecs) for child_name in child_names
            _extract_tree(gruptree_at_date, smry_sorted_by_date, number_of_dates, node_sumvec_info_dict, child_name) for child_name in child_names
        ],
    )
    return result


# def _extract_tree(
#     gruptree_at_date: pd.DataFrame,
#     nodename: str,
#     smry_grouped_by_date: Dict[Any, pd.DataFrame],
#     dates: list,
#     sumvecs: pd.DataFrame,
# ) -> RecursiveTreeNode:
#     """Extract the tree part of the GroupTree component dataset. This functions
#     works recursively and is initially called with the terminal node of the tree
#     (usually FIELD)
#     """
#     # pylint: disable=too-many-locals
#     node_sumvecs = sumvecs[sumvecs["NODENAME"] == nodename]
#     nodedict = _get_nodedict(gruptree_at_date, nodename)

#     edges = node_sumvecs[node_sumvecs["EDGE_NODE"] == EdgeOrNode.EDGE].to_dict("records")
#     nodes = node_sumvecs[node_sumvecs["EDGE_NODE"] == EdgeOrNode.NODE].to_dict("records")

#     edge_data: Dict[str, List[float]] = {item["DATATYPE"].value: [] for item in edges}
#     node_data: Dict[str, List[float]] = {item["DATATYPE"].value: [] for item in nodes}

#     # Looping the dates only once is very important for the speed of this function
#     for _, smry_at_date in smry_grouped_by_date:
#         for item in edges:
#             edge_data[item["DATATYPE"].value].append(float(round(smry_at_date[item["SUMVEC"]].values[0], 2)))
#         for item in nodes:
#             try:
#                 node_data[item["DATATYPE"].value].append(float(round(smry_at_date[item["SUMVEC"]].values[0], 2)))
#             except KeyError:
#                 node_data[item["DATATYPE"].value].append(np.nan)

#     children = list(gruptree_at_date[gruptree_at_date["PARENT"] == nodename]["CHILD"].unique())

#     result = RecursiveTreeNode(
#         node_label=nodename,
#         node_type="Well" if nodedict["KEYWORD"] == "WELSPECS" else "Group",
#         edge_label=nodedict["EDGE_LABEL"],
#         edge_data=edge_data,
#         node_data=node_data,
#         children=[_extract_tree(gruptree_at_date, child, smry_grouped_by_date, dates, sumvecs) for child in children],
#     )
#     return result


def _get_nodedict(gruptree: pd.DataFrame, nodename: str) -> Dict[str, Any]:
    """Returns the node data from a row in the gruptree dataframe as a dictionary.
    This function also checks that there is exactly one element with the given name.
    """
    df = gruptree[gruptree["CHILD"] == nodename]
    if df.empty:
        raise ValueError(f"No gruptree row found for node {nodename}")
    if df.shape[0] > 1:
        raise ValueError(f"Multiple gruptree rows found for node {nodename}. {df}")
    return df.to_dict("records")[0]

def _get_node_type_and_edge_label(gruptree_at_date: pd.DataFrame, nodename:str)-> Tuple[str,str]:
    node_tree_data = gruptree_at_date[gruptree_at_date["CHILD"] == nodename]
    if node_tree_data.empty:
        raise ValueError(f"No gruptree row found for node {nodename}")
    if node_tree_data.shape[0] > 1:
        raise ValueError(f"Multiple gruptree rows found for node {nodename}. {node_tree_data}")

    node_keyword = node_tree_data["KEYWORD"].values[0]
    node_type = "Well" if node_keyword == "WELSPECS" else "Group"
    edge_label = node_tree_data["EDGE_LABEL"].values[0]

    return (node_type,edge_label)
