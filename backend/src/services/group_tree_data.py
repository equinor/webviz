import logging
from enum import Enum
from functools import reduce
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import pyarrow as pa
from fastapi import HTTPException
from src.services.sumo_access.group_tree_access import GroupTreeAccess
from src.services.sumo_access.summary_access import Frequency, SummaryAccess

LOGGER = logging.getLogger(__name__)


class TreeType(Enum):
    GRUPTREE = "GRUPTREE"
    BRANPROP = "BRANPROP"


class TreeModeOptions(Enum):
    STATISTICS = "statistics"
    SINGLE_REAL = "single_real"


class StatOptions(Enum):
    MEAN = "mean"
    P10 = "p10"
    P50 = "p50"
    P90 = "p90"
    MAX = "max"
    MIN = "min"


class NodeType(Enum):
    PROD = "prod"
    INJ = "inj"
    OTHER = "other"


class DataType(Enum):
    OILRATE = "oilrate"
    GASRATE = "gasrate"
    WATERRATE = "waterrate"
    WATERINJRATE = "waterinjrate"
    GASINJRATE = "gasinjrate"
    PRESSURE = "pressure"
    BHP = "bhp"
    WMCTL = "wmctl"


class EdgeOrNode(Enum):
    EDGE = "edge"
    NODE = "node"


class GroupTreeData:
    def __init__(
        self,
        grouptree_access: GroupTreeAccess,
        summary_access: SummaryAccess,
        resampling_frequency: Frequency,
        realization: Optional[int] = None,
        terminal_node: str = "FIELD",
        tree_type: str = "GRUPTREE",
        excl_well_startswith: Optional[List[str]] = None,
        excl_well_endswith: Optional[List[str]] = None,
    ):
        self._grouptree_access = grouptree_access
        self._summary_access = summary_access
        self._realization = realization
        self._terminal_node = terminal_node
        self._tree_type = TreeType(tree_type)
        self._excl_well_startswith = excl_well_startswith
        self._excl_well_endswith = excl_well_endswith
        self._resampling_frequency = resampling_frequency

    async def initialize_data(self) -> None:
        grouptree_df = await self._grouptree_access.get_group_tree_table(realization=self._realization)
        if grouptree_df is None:
            raise HTTPException(status_code=404, detail="Group tree data not found")

        self._grouptree_model = GroupTreeModel(grouptree_df, self._tree_type)

        self._grouptree = self._grouptree_model.get_filtered_dataframe(
            terminal_node=self._terminal_node,
            excl_well_startswith=self._excl_well_startswith,
            excl_well_endswith=self._excl_well_endswith,
        )

        self._wells: List[str] = self._grouptree[self._grouptree["KEYWORD"] == "WELSPECS"]["CHILD"].unique()

        vector_info_arr = await self._summary_access.get_available_vectors()
        self._all_vectors: List[str] = [vec.name for vec in vector_info_arr]

        # Check that all WSTAT summary vectors exist
        # They are used to determine which summary vector are needed next.
        self._check_that_sumvecs_exists([f"WSTAT:{well}" for well in self._wells])

        wstat_unique = {}
        for well in self._wells:
            vec = f"WSTAT:{well}"
            table, _ = await self._summary_access.get_vector_table(
                vector_name=vec,
                resampling_frequency=self._resampling_frequency,
                realizations=None,  # {self._realization}
            )
            # Get unique wstat values for well
            wstat_unique[well] = pa.compute.unique(table[vec]).to_pylist()

        # Add nodetypes IS_PROD, IS_INJ and IS_OTHER to gruptree
        self._grouptree = _add_nodetype(self._grouptree, wstat_unique, self._wells, self._terminal_node)

        self._has_waterinj = False
        self._has_gasinj = False
        if True in self._grouptree["IS_INJ"].unique():
            # If there is injection in the tree we need to determine
            # which kind of injection. For that wee need FWIR and FGIR
            self._check_that_sumvecs_exists(["FWIR", "FGIR"])
            smry = {}
            for vec in ["FWIR", "FGIR"]:
                table, _ = await self._summary_access.get_vector_table(
                    vector_name=vec,
                    resampling_frequency=self._resampling_frequency,
                    realizations=None,
                )
                smry[vec] = table

            self._has_waterinj = pa.compute.sum(smry["FWIR"]["FWIR"]).as_py() > 0
            self._has_gasinj = pa.compute.sum(smry["FGIR"]["FGIR"]).as_py() > 0

        # Add edge label
        self._grouptree["EDGE_LABEL"] = self._grouptree.apply(_get_edge_label, axis=1)

        # Get summary data with metadata (nodename, datatype, edge_or_node)
        self._sumvecs: pd.DataFrame = self._get_sumvecs_with_metadata()

        # Check that all edge summary vectors exist
        self._check_that_sumvecs_exists(list(self._sumvecs[self._sumvecs["EDGE_NODE"] == EdgeOrNode.EDGE]["SUMVEC"]))

    async def create_group_tree_dataset(
        self,
        tree_mode: TreeModeOptions,
        node_types: List[NodeType],
        real: Optional[int] = None,
        stat_option: Optional[StatOptions] = None,
    ) -> List[Dict[Any, Any]]:
        """This method is called when an event is triggered to create a new dataset
        to the GroupTree plugin. First there is a lot of filtering of the smry and
        grouptree data, before the filtered data is sent to the function that is
        actually creating the dataset.

        Returns the group tree data and two lists with dropdown options for what
        to display on the edges and nodes.

        A sample data set can be found here:
        https://github.com/equinor/webviz-subsurface-components/blob/master/react/src/demo/example-data/group-tree.json
        """  # noqa

        if tree_mode == TreeModeOptions.SINGLE_REAL and real is None:
            raise ValueError("Realization cannot be None when Tree mode is SINGLE REAL")

        # Filter smry
        vectors = [sumvec for sumvec in self._sumvecs["SUMVEC"] if sumvec in self._all_vectors]

        dfs = []
        for vec in vectors:
            table, _ = await self._summary_access.get_vector_table(
                vector_name=vec,
                resampling_frequency=self._resampling_frequency,
                realizations=[real] if real is not None else None,
            )
            dfs.append(table.to_pandas())

        smry = reduce(lambda left, right: pd.merge(left, right, on=["DATE", "REAL"]), dfs)

        if tree_mode is TreeModeOptions.STATISTICS:
            if stat_option is StatOptions.MEAN:
                smry = smry.groupby("DATE").mean().reset_index()
            elif stat_option in [StatOptions.P50, StatOptions.P10, StatOptions.P90]:
                quantile = {"p50": 0.5, "p10": 0.9, "p90": 0.1}[stat_option.value]
                smry = smry.groupby("DATE").quantile(quantile).reset_index()
            elif stat_option is StatOptions.MAX:
                smry = smry.groupby("DATE").max().reset_index()
            elif stat_option is StatOptions.MIN:
                smry = smry.groupby("DATE").min().reset_index()
            else:
                raise ValueError(f"Statistical option: {stat_option.value} not implemented")

        if tree_mode == TreeModeOptions.STATISTICS and not self._grouptree_model._tree_is_equivalent_in_all_real:
            raise ValueError(
                "Statistics cannot be calculated because the Group Tree is not equivalent in all realizations."
            )

        # Filter nodetype prod, inj and/or other
        dfs = []
        for tpe in node_types:
            dfs.append(self._grouptree[self._grouptree[f"IS_{tpe.value}".upper()]])
        gruptree_filtered = pd.concat(dfs).drop_duplicates()

        return await _create_dataset(smry, gruptree_filtered, self._sumvecs, self._terminal_node)

        # return (
        #     await _create_dataset(smry, gruptree_filtered, self._sumvecs, self._terminal_node),
        #     await self._get_edge_options(node_types),
        #     [
        #         {"name": datatype, "label": await _get_label(datatype)}
        #         for datatype in [DataType.PRESSURE, DataType.BHP, DataType.WMCTL]
        #     ],
        # )

    def _check_that_sumvecs_exists(self, check_sumvecs: List[str]) -> None:
        """Takes in a list of summary vectors and checks if they are
        present in the summary dataset. If any are missing, a ValueError
        is raised with the list of all missing summary vectors.
        """
        missing_sumvecs = [sumvec for sumvec in check_sumvecs if sumvec not in self._all_vectors]
        if missing_sumvecs:
            str_missing_sumvecs = ", ".join(missing_sumvecs)
            raise ValueError("Missing summary vectors for the GroupTree plugin: " f"{str_missing_sumvecs}.")

    def _get_sumvecs_with_metadata(
        self,
    ) -> pd.DataFrame:
        """Returns a dataframe with the summary vectors that is needed to
        put together the group tree dataset. The other columns are metadata:

        * nodename: name in eclipse network
        * datatype: oilrate, gasrate, pressure etc
        * edge_node: whether the datatype is edge (f.ex rates) or node (f.ex pressure)

        Rates are not required for the terminal node since they will not be used.
        """
        records = []

        unique_nodes = self._grouptree.drop_duplicates(subset=["CHILD", "KEYWORD"])
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

    def _get_edge_options(self, node_types: List[NodeType]) -> List[Dict[str, str]]:
        """Returns a list with edge node options for the dropdown
        menu in the GroupTree component. The output list has the format:
        [
            {"name": DataType.OILRATE, "label": "Oil Rate"},
            {"name": DataType.GasRATE, "label": "Gas Rate"},
        ]
        """
        options = []
        if NodeType.PROD in node_types:
            for rate in [DataType.OILRATE, DataType.GASRATE, DataType.WATERRATE]:
                options.append({"name": rate, "label": _get_label(rate)})
        if NodeType.INJ in node_types and self._has_waterinj:
            options.append(
                {
                    "name": DataType.WATERINJRATE,
                    "label": _get_label(DataType.WATERINJRATE),
                }
            )
        if NodeType.INJ in node_types and self._has_gasinj:
            options.append({"name": DataType.GASINJRATE, "label": _get_label(DataType.GASINJRATE)})
        if options:
            return options
        return [{"name": DataType.OILRATE, "label": _get_label(DataType.OILRATE)}]


def _add_nodetype(
    gruptree: pd.DataFrame,
    wstat_unique: Dict[str, List[int]],
    all_wells: List[str],
    terminal_node: str,
) -> pd.DataFrame:
    """Adds nodetype IS_PROD, IS_INJ and IS_OTHER."""

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
    leafnodes: pd.DataFrame, wstat_unique: Dict[str, List[int]], all_wells: List[str]
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

        if nodekeyword == "WELSPECS":
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

            smry = pd.DataFrame()

            # smry = provider.get_vectors_df(
            #     [
            #         sumvec
            #         for sumvec in (prod_sumvecs + inj_sumvecs)
            #         if sumvec in provider.vector_names()
            #     ],
            #     None,
            # )

            sumprod = sum([smry[sumvec].sum() for sumvec in prod_sumvecs if sumvec in smry.columns])

            suminj = sum([smry[sumvec].sum() for sumvec in inj_sumvecs if sumvec in smry.columns])

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
    if datatype in labels:
        return labels[datatype]
    raise ValueError(f"Label for datatype {datatype.value} not implemented.")


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
    datatype_map = {
        "FIELD": {
            DataType.OILRATE: "FOPR",
            DataType.GASRATE: "FGPR",
            DataType.WATERRATE: "FWPR",
            DataType.WATERINJRATE: "FWIR",
            DataType.GASINJRATE: "FGIR",
            DataType.PRESSURE: "GPR",
        },
        "GRUPTREE": {
            DataType.OILRATE: "GOPR",
            DataType.GASRATE: "GGPR",
            DataType.WATERRATE: "GWPR",
            DataType.WATERINJRATE: "GWIR",
            DataType.GASINJRATE: "GGIR",
            DataType.PRESSURE: "GPR",
        },
        # BRANPROP can not be used for injection, but the nodes
        # might also be GNETINJE and could therefore have injection.
        "BRANPROP": {
            DataType.OILRATE: "GOPRNB",
            DataType.GASRATE: "GGPRNB",
            DataType.WATERRATE: "GWPRNB",
            DataType.PRESSURE: "GPR",
            DataType.WATERINJRATE: "GWIR",
            DataType.GASINJRATE: "GGIR",
        },
        "WELSPECS": {
            DataType.OILRATE: "WOPR",
            DataType.GASRATE: "WGPR",
            DataType.WATERRATE: "WWPR",
            DataType.WATERINJRATE: "WWIR",
            DataType.GASINJRATE: "WGIR",
            DataType.PRESSURE: "WTHP",
            DataType.BHP: "WBHP",
            DataType.WMCTL: "WMCTL",
        },
    }
    if nodename == "FIELD":
        datatype_ecl = datatype_map["FIELD"][datatype]
        if datatype == "pressure":
            return f"{datatype_ecl}:{nodename}"
        return datatype_ecl
    try:
        datatype_ecl = datatype_map[keyword][datatype]
    except KeyError as exc:
        error = (
            f"Summary vector not found for eclipse keyword: {keyword}, "
            f"data type: {datatype.value} and node name: {nodename}. "
        )
        raise KeyError(error) from exc
    return f"{datatype_ecl}:{nodename}"


class GroupTreeModel:
    """Facilitates loading of gruptree tables. Can be reused in all
    plugins that are using grouptree data and extended with additional
    functionality and filtering options if necessary.
    """

    def __init__(
        self,
        dataframe: pd.DataFrame,
        tree_type: TreeType,
    ):
        self._dataframe = dataframe

        if tree_type.value not in self._dataframe["KEYWORD"].unique():
            raise ValueError(f"Tree type: {tree_type} not found in grouptree dataframe.")

        self._tree_type = tree_type

        if self._tree_type == TreeType.GRUPTREE:
            # Filter out BRANPROP entries
            self._dataframe = self._dataframe[self._dataframe["KEYWORD"] != TreeType.BRANPROP.value]

        if self._tree_type == TreeType.BRANPROP:
            # Filter out GRUPTREE entries
            self._dataframe = self._dataframe[self._dataframe["KEYWORD"] != TreeType.GRUPTREE.value]

        self._tree_is_equivalent_in_all_real = False

        if "REAL" not in self._dataframe.columns or self._dataframe["REAL"].nunique() == 1:
            self._tree_is_equivalent_in_all_real = True

    @property
    def dataframe(self) -> pd.DataFrame:
        """Returns a dataframe that will have the following columns:
        * DATE
        * CHILD (node in tree)
        * PARENT (node in tree)
        * KEYWORD (GRUPTREE, WELSPECS or BRANPROP)
        * REAL

        If gruptrees are exactly equal in all realizations then only one tree is
        stored in the dataframe. That means the REAL column will only have one unique value.
        If not, all trees are stored.
        """
        return self._dataframe

    @property
    def tree_is_equivalent_in_all_real(self) -> bool:
        return self.tree_is_equivalent_in_all_real

    def get_filtered_dataframe(
        self,
        terminal_node: Optional[str] = None,
        excl_well_startswith: Optional[List[str]] = None,
        excl_well_endswith: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """This function returns a sub-set of the rows in the gruptree dataframe
        filtered according to the input arguments:

        - terminal_node: returns the terminal node and all nodes below it in the
        tree (for all realizations and dates)
        - excl_well_startswith: removes WELSPECS rows where CHILD starts with any
        of the entries in the list.
        - excl_well_endswith: removes WELSPECS rows where CHILD ends with any
        of the entries in the list.

        """
        df = self._dataframe

        if terminal_node is not None:
            if terminal_node not in self._dataframe["CHILD"].unique():
                raise ValueError(
                    f"Terminal node '{terminal_node}' not found in 'CHILD' column " "of the gruptree data."
                )
            if terminal_node != "FIELD":
                branch_nodes = self._get_branch_nodes(terminal_node)
                df = self._dataframe[self._dataframe["CHILD"].isin(branch_nodes)]

        def filter_wells(dframe: pd.DataFrame, well_name_criteria: Callable) -> pd.DataFrame:
            return dframe[
                (dframe["KEYWORD"] != "WELSPECS")
                | ((dframe["KEYWORD"] == "WELSPECS") & (~well_name_criteria(dframe["CHILD"])))
            ]

        if excl_well_startswith is not None:
            # Filter out WELSPECS rows where CHILD starts with any element in excl_well_startswith
            # Conversion to tuple done outside lambda due to mypy
            excl_well_startswith_tuple = tuple(excl_well_startswith)
            df = filter_wells(df, lambda x: x.str.startswith(excl_well_startswith_tuple))

        if excl_well_endswith is not None:
            # Filter out WELSPECS rows where CHILD ends with any element in excl_well_endswith
            # Conversion to tuple done outside lambda due to mypy
            excl_well_endswith_tuple = tuple(excl_well_endswith)
            df = filter_wells(df, lambda x: x.str.endswith(excl_well_endswith_tuple))

        return df.copy()

    def _get_branch_nodes(self, terminal_node: str) -> List[str]:
        """The function is using recursion to find all wells below the node
        in the three.
        """
        branch_nodes = [terminal_node]

        children = self._dataframe[self._dataframe["PARENT"] == terminal_node].drop_duplicates(
            subset=["CHILD"], keep="first"
        )

        for _, childrow in children.iterrows():
            branch_nodes.extend(self._get_branch_nodes(childrow["CHILD"]))
        return branch_nodes


async def _create_dataset(
    smry: pd.DataFrame,
    gruptree: pd.DataFrame,
    sumvecs: pd.DataFrame,
    terminal_node: str,
) -> List[dict]:
    """The function puts together the GroupTree component input dataset.

    The gruptree dataframe includes complete networks for every time
    the tree changes (f.ex if a new well is defined). The function loops
    through the trees and puts together all the summary data that is valid for
    the time span where the tree is valid, along with the tree structure itself.
    """
    trees = []
    # loop trees
    for date, gruptree_date in gruptree.groupby("DATE"):
        next_date = gruptree[gruptree.DATE > date]["DATE"].min()
        if pd.isna(next_date):
            next_date = smry["DATE"].max()
        smry_in_datespan = smry[(smry["DATE"] >= date) & (smry["DATE"] < next_date)].groupby("DATE")
        dates = list(smry_in_datespan.groups)
        if dates:
            trees.append(
                {
                    "dates": [date.strftime("%Y-%m-%d") for date in dates],
                    "tree": await _extract_tree(gruptree_date, terminal_node, smry_in_datespan, dates, sumvecs),
                }
            )
        else:
            LOGGER.info(f"""No summary data found for gruptree between {date} and {next_date}""")
    return trees


async def _extract_tree(
    gruptree: pd.DataFrame,
    nodename: str,
    smry_in_datespan: Dict[Any, pd.DataFrame],
    dates: list,
    sumvecs: pd.DataFrame,
) -> dict:
    """Extract the tree part of the GroupTree component dataset. This functions
    works recursively and is initially called with the terminal node of the tree
    (usually FIELD)
    """
    # pylint: disable=too-many-locals
    node_sumvecs = sumvecs[sumvecs["NODENAME"] == nodename]
    nodedict = await _get_nodedict(gruptree, nodename)
    # print(node_sumvecs)
    # print(nodedict)

    result: dict = {
        "node_label": nodename,
        "node_type": "Well" if nodedict["KEYWORD"] == "WELSPECS" else "Group",
        "edge_label": nodedict["EDGE_LABEL"],
    }

    edges = node_sumvecs[node_sumvecs["EDGE_NODE"] == EdgeOrNode.EDGE].to_dict("records")
    nodes = node_sumvecs[node_sumvecs["EDGE_NODE"] == EdgeOrNode.NODE].to_dict("records")

    edge_data: Dict[str, List[float]] = {item["DATATYPE"].value: [] for item in edges}
    node_data: Dict[str, List[float]] = {item["DATATYPE"].value: [] for item in nodes}

    # Looping the dates only once is very important for the speed of this function
    for _, smry_at_date in smry_in_datespan:
        for item in edges:
            edge_data[item["DATATYPE"].value].append(float(round(smry_at_date[item["SUMVEC"]].values[0], 2)))
        for item in nodes:
            try:
                node_data[item["DATATYPE"].value].append(float(round(smry_at_date[item["SUMVEC"]].values[0], 2)))
            except KeyError:
                node_data[item["DATATYPE"].value].append(np.nan)
    result["edge_data"] = edge_data
    result["node_data"] = node_data
    children = list(gruptree[gruptree["PARENT"] == nodename]["CHILD"].unique())
    if children:
        result["children"] = [
            await _extract_tree(gruptree, child, smry_in_datespan, dates, sumvecs) for child in children
        ]
    return result


async def _get_nodedict(gruptree: pd.DataFrame, nodename: str) -> Dict[str, Any]:
    """Returns the node data from a row in the gruptree dataframe as a dictionary.
    This function also checks that there is exactly one element with the given name.
    """
    df = gruptree[gruptree["CHILD"] == nodename]
    if df.empty:
        raise ValueError(f"No gruptree row found for node {nodename}")
    if df.shape[0] > 1:
        raise ValueError(f"Multiple gruptree rows found for node {nodename}. {df}")
    return df.to_dict("records")[0]
