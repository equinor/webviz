from typing import Callable, Dict, List, Optional

import pandas as pd
import numpy as np

from primary.services.sumo_access.group_tree_types import DataType, TreeType

GROUP_TREE_FIELD_DATATYPE_TO_VECTOR_MAP = {
    DataType.OILRATE: "FOPR",
    DataType.GASRATE: "FGPR",
    DataType.WATERRATE: "FWPR",
    DataType.WATERINJRATE: "FWIR",
    DataType.GASINJRATE: "FGIR",
    DataType.PRESSURE: "GPR",
}

TREE_TYPE_DATATYPE_TO_GROUP_VECTOR_DATATYPE_MAP = {
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
}

GROUPTREE_DATATYPE_TO_WELL_VECTOR_DATATYPE_MAP = {
    DataType.OILRATE: "WOPR",
    DataType.GASRATE: "WGPR",
    DataType.WATERRATE: "WWPR",
    DataType.WATERINJRATE: "WWIR",
    DataType.GASINJRATE: "WGIR",
    DataType.PRESSURE: "WTHP",
    DataType.BHP: "WBHP",
    DataType.WMCTL: "WMCTL",
}

FIELD_VECTORS_OF_INTEREST: List[str] = list(GROUP_TREE_FIELD_DATATYPE_TO_VECTOR_MAP.values())
WELLS_VECTOR_DATATYPES_OF_INTEREST: List[str] = list(GROUPTREE_DATATYPE_TO_WELL_VECTOR_DATATYPE_MAP.values())
GROUP_VECTOR_DATATYPES_OF_INTEREST = [
    v for kw in ["GRUPTREE", "BRANPROP"] for v in TREE_TYPE_DATATYPE_TO_GROUP_VECTOR_DATATYPE_MAP[kw].values()
]


class GroupTreeDataframeModel:
    """Facilitates loading of gruptree tables. Can be reused in all
    plugins that are using grouptree data and extended with additional
    functionality and filtering options if necessary.

    The group tree dataframe in model has to have the following columns:

    * DATE
    * CHILD
    * PARENT
    * KEYWORD (GRUPTREE, BRANPROP or WELSPECS)
    * REAL

    If gruptrees are exactly equal in all realizations then only one tree is
    stored in the dataframe. That means the REAL column will only have one unique value.
    If not, all trees are stored.
    """

    _grouptree_df: pd.DataFrame
    _terminal_node: Optional[str]
    _tree_is_equivalent_in_all_real: bool
    _tree_type: TreeType

    _grouptree_wells: List[str] = []
    _grouptree_groups: List[str] = []
    _grouptree_wstat_vectors: List[str] = []

    def __init__(
        self,
        grouptree_dataframe: pd.DataFrame,
        tree_type: TreeType,
        terminal_node: Optional[str] = None,
    ):
        """
        Initialize the group tree model with group tree dataframe and tree type

        Expected columns have to be present in the dataframe:
        * DATE
        * CHILD
        * PARENT
        * KEYWORD (GRUPTREE, BRANPROP or WELSPECS)
        """
        expected_columns = {"DATE", "CHILD", "KEYWORD", "PARENT"}
        if not expected_columns.issubset(grouptree_dataframe.columns):
            raise ValueError(
                f"Expected columns: {expected_columns} not found in the grouptree dataframe. "
                f"Columns found: {grouptree_dataframe.columns}"
            )

        self._grouptree_df = grouptree_dataframe

        if tree_type.value not in self._grouptree_df["KEYWORD"].unique():
            raise ValueError(f"Tree type: {tree_type} not found in grouptree dataframe.")

        self._terminal_node = terminal_node
        self._tree_type = tree_type

        if self._tree_type == TreeType.GRUPTREE:
            # Filter out BRANPROP entries
            self._grouptree_df = self._grouptree_df[self._grouptree_df["KEYWORD"] != TreeType.BRANPROP.value]
        elif self._tree_type == TreeType.BRANPROP:
            # Filter out GRUPTREE entries
            self._grouptree_df = self._grouptree_df[self._grouptree_df["KEYWORD"] != TreeType.GRUPTREE.value]

        self._tree_is_equivalent_in_all_real = False
        if "REAL" not in self._grouptree_df.columns or self._grouptree_df["REAL"].nunique() == 1:
            self._tree_is_equivalent_in_all_real = True

        self._grouptree_wells = self._grouptree_df[self._grouptree_df["KEYWORD"] == "WELSPECS"]["CHILD"].unique()
        self._grouptree_groups = list(
            set(self._grouptree_df[self._grouptree_df["KEYWORD"].isin(["GRUPTREE", "BRANPROP"])]["CHILD"].unique())
        )

        self._grouptree_wstat_vectors = [f"WSTAT:{well}" for well in self._grouptree_wells]

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
        return self._grouptree_df

    @property
    def tree_is_equivalent_in_all_real(self) -> bool:
        return self.tree_is_equivalent_in_all_real

    @property
    def group_tree_wells(self) -> List[str]:
        return self._grouptree_wells

    @property
    def wstat_vectors(self) -> List[str]:
        """
        Returns the well state indicator vectors for all wells in the group tree

        The vectors are of the form "WSTAT:{well_name}"
        """
        return self._grouptree_wstat_vectors

    def create_filtered_dataframe(
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
        df = self._grouptree_df

        if terminal_node is not None:
            if terminal_node not in self._grouptree_df["CHILD"].unique():
                raise ValueError(
                    f"Terminal node '{terminal_node}' not found in 'CHILD' column " "of the gruptree data."
                )
            if terminal_node != "FIELD":
                branch_nodes = self._create_branch_nodes(terminal_node)
                df = self._grouptree_df[self._grouptree_df["CHILD"].isin(branch_nodes)]

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
    
    def create_node_edge_label_dict(self) -> Dict[str, str]:
        """Create a dictionary with the node as key and the edge label as value
        
        Assuming unique edge label for node across all dates.
        """
        
        unique_node_names = self._grouptree_df["CHILD"].unique().tolist()
        node_names_column_list = self._grouptree_df["CHILD"].tolist()
        vfp_table_column_list = self._grouptree_df["VFP_TABLE"].tolist()

        if "VFP_TABLE" not in self._grouptree_df.columns:
            return {node_name: "" for node_name in unique_node_names}
        
        
        node_name_to_edge_label_map: Dict[str,str]={}
        for node_name in unique_node_names:
            index = node_names_column_list.index(node_name)
            vfp_nb = vfp_table_column_list[index]
            if vfp_nb in [None, 9999] or np.isnan(vfp_nb):
                node_name_to_edge_label_map[node_name] = ""
            else:
                node_name_to_edge_label_map[node_name] = f"VFP {int(vfp_nb)}"

        return node_name_to_edge_label_map

    def create_vector_of_interest_list(self) -> List[str]:
        """
        Create a list of vectors based on the possible combinations of vector datatypes and vector nodes
        for a group tree

        This implies vectors for field, group and well.

        Only returns the candidates which exist among the valid vectors
        """

        # Find all summary vectors with group tree wells
        group_tree_well_vector_candidates = _create_vector_candidates(
            WELLS_VECTOR_DATATYPES_OF_INTEREST, self._grouptree_wells
        )

        # Find all summary vectors with group tree groups
        group_tree_group_vector_candidates = _create_vector_candidates(
            GROUP_VECTOR_DATATYPES_OF_INTEREST, self._grouptree_groups
        )

        # Find all summary vectors with field vectors
        group_tree_field_vectors_candidates = FIELD_VECTORS_OF_INTEREST

        all_vectors_of_interest = (
            group_tree_well_vector_candidates
            + group_tree_group_vector_candidates
            + group_tree_field_vectors_candidates
            + self._grouptree_wstat_vectors
        )

        # Ensure non duplicated vectors
        unique_vectors_of_interst = list(set(all_vectors_of_interest))
        return unique_vectors_of_interst

    def _create_branch_nodes(self, terminal_node: str) -> List[str]:
        """The function is using recursion to find all wells below the node
        in the tree.
        """
        branch_nodes = [terminal_node]

        children = self._grouptree_df[self._grouptree_df["PARENT"] == terminal_node].drop_duplicates(
            subset=["CHILD"], keep="first"
        )

        for _, childrow in children.iterrows():
            branch_nodes.extend(self._create_branch_nodes(childrow["CHILD"]))
        return branch_nodes


def _create_vector_candidates(vector_datatype_candidates: List[str], vector_node_candidates: List[str]) -> List[str]:
    """Create a list of vectors based on the list of vector datatype candidates and vector node candidates

    A vector is then given by "{vector_datatype}:{vector_node}"

    E.g. "WOPT:WELL1"
    """
    result: List[str] = []
    for datatype in vector_datatype_candidates:
        for node in vector_node_candidates:
            result.append(f"{datatype}:{node}")
    return result
