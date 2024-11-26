from typing import Callable, List, Optional

import pandas as pd

from primary.services.sumo_access.group_tree_types import TreeType


class GroupTreeDataframeModel:
    """
    A helper class for handling group tree dataframes retrieved from Sumo.

    Provides a set of methods for filtering and extracting data from the dataframe.

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
    _tree_type: TreeType

    _grouptree_wells: List[str] = []
    _grouptree_groups: List[str] = []

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

        # Note: Only support single realization for now
        if "REAL" in grouptree_dataframe.columns:
            raise ValueError("Only single realization is supported for group tree now.")

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

        group_tree_wells: set[str] = set()
        group_tree_groups: set[str] = set()
        group_tree_keywords: List[str] = self._grouptree_df["KEYWORD"].to_list()
        group_tree_nodes: List[str] = self._grouptree_df["CHILD"].to_list()
        for keyword, node in zip(group_tree_keywords, group_tree_nodes):
            if keyword == "WELSPECS":
                group_tree_wells.add(node)
            elif keyword in ["GRUPTREE", "BRANPROP"]:
                group_tree_groups.add(node)

        self._grouptree_wells = list(group_tree_wells)
        self._grouptree_groups = list(group_tree_groups)

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
    def group_tree_wells(self) -> List[str]:
        return self._grouptree_wells

    @property
    def group_tree_groups(self) -> List[str]:
        return self._grouptree_groups

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
                branch_nodes = self._create_branch_node_list(terminal_node)
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

    def _create_branch_node_list(self, terminal_node: str) -> List[str]:
        """
        This function lists all nodes in a branch of the group tree starting from the terminal node.
        """
        branch_node_set = set(terminal_node)

        nodes_array = self._grouptree_df["CHILD"].to_numpy()
        parents_array = self._grouptree_df["PARENT"].to_numpy()

        if terminal_node not in parents_array:
            return list(branch_node_set)

        current_parents = [terminal_node]
        while len(current_parents) > 0:
            # Find all indexes matching the current parents
            children_indices = set([i for i, x in enumerate(parents_array) if x in current_parents])

            # Find all children of the current parents
            children = nodes_array[list(children_indices)]
            branch_node_set.update(children)
            current_parents = children

        return list(branch_node_set)
