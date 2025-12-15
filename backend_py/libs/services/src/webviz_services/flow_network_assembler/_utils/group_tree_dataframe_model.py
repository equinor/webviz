import polars as pl
import pyarrow as pa

from webviz_services.service_exceptions import InvalidDataError, MultipleDataMatchesError, NoDataError, Service

from webviz_services.flow_network_assembler.flow_network_types import TreeType


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

    _grouptree_df: pl.DataFrame
    _grouptree_wells: list[str] = []
    _grouptree_tree_types: list[TreeType] = []

    _terminal_node: str | None = None
    _excl_well_startswith: list[str] | None = None
    _excl_well_endswith: list[str] | None = None

    def __init__(
        self,
        group_tree_table_pa: pa.Table,
        terminal_node: str | None = None,
        excl_well_startswith: list[str] | None = None,
        excl_well_endswith: list[str] | None = None,
    ):
        """
        Initialize the group tree model with group tree dataframe and tree type

        Expected columns have to be present in the dataframe:
        * DATE
        * CHILD
        * PARENT
        * KEYWORD (GRUPTREE, BRANPROP or WELSPECS)
        """

        # Convert PyArrow to Polars DataFrame
        grouptree_df = pl.DataFrame(group_tree_table_pa)

        # Validate expected columns - verify existence and data types
        GroupTreeDataframeModel.validate_expected_columns(grouptree_df)

        # Note: Only support single realization for now
        if "REAL" in grouptree_df.columns:
            raise MultipleDataMatchesError(
                "Only single realization is supported for group tree now.", service=Service.GENERAL
            )

        self._terminal_node = terminal_node
        self._excl_well_startswith = excl_well_startswith
        self._excl_well_endswith = excl_well_endswith

        # Extract wells and groups with expressions
        wells_expr = pl.col("KEYWORD") == "WELSPECS"
        tree_type_expr = pl.col("KEYWORD").is_in(["GRUPTREE", "BRANPROP"])
        self._grouptree_wells = grouptree_df.filter(wells_expr)["CHILD"].unique().to_list()
        tree_type_strings = grouptree_df.filter(tree_type_expr)["KEYWORD"].unique().to_list()

        # Convert to TreeType enums
        self._grouptree_tree_types = []
        for tree_type_str in tree_type_strings:
            tree_type = TreeType.from_string_value(tree_type_str)
            if tree_type is None:
                raise InvalidDataError(
                    f"Invalid tree type '{tree_type_str}' found in group tree dataframe.",
                    service=Service.GENERAL,
                )

            self._grouptree_tree_types.append(tree_type)

        # Filter dataframe
        self._grouptree_df = GroupTreeDataframeModel._create_filtered_dataframe(
            grouptree_df,
            terminal_node=self._terminal_node,
            excl_well_startswith=self._excl_well_startswith,
            excl_well_endswith=self._excl_well_endswith,
        )

    @property
    def dataframe(self) -> pl.DataFrame:
        """
        Get the full filtered group tree dataframe
        """
        return self._grouptree_df

    def create_df_for_tree_type(self, tree_type: TreeType) -> pl.DataFrame:
        """
        Filter dataframe to include only dates where the selected tree type is defined,
        and only include WELSPECS nodes that belong to the selected tree type.

        A WELSPECS node belongs to a tree if its parent node exists in that tree's definition.
        """
        if tree_type not in self._grouptree_tree_types:
            raise NoDataError(
                f"Tree type '{tree_type}' not found in the group tree dataframe.",
                Service.GENERAL,
            )

        # Expression for selected tree type
        tree_type_expr = pl.col("KEYWORD") == tree_type.value

        # Find dates where the selected tree type is defined
        dates_for_tree_type = self._grouptree_df.filter(tree_type_expr)["DATE"].unique()

        # Filter to only include rows from those dates
        date_filtered_df = self._grouptree_df.filter(pl.col("DATE").is_in(dates_for_tree_type))

        # Get all nodes that are defined in the selected tree type (across all dates)
        tree_nodes = date_filtered_df.filter(tree_type_expr)["CHILD"].unique()

        # Keep rows that are:
        # 1. The selected tree type itself (GRUPTREE or BRANPROP)
        # 2. WELSPECS whose parent exists in the selected tree type
        is_welspecs_with_valid_parent = (pl.col("KEYWORD") == "WELSPECS") & pl.col("PARENT").is_in(tree_nodes)
        return date_filtered_df.filter(tree_type_expr | is_welspecs_with_valid_parent)

    @staticmethod
    def validate_expected_columns(dataframe: pl.DataFrame) -> None:
        """
        Validate expected columns and their data types for the dataframe to ensure correct processing.
        """
        if dataframe.is_empty():
            raise InvalidDataError("The group tree dataframe is empty.", service=Service.GENERAL)

        if not GroupTreeDataframeModel.has_expected_columns(dataframe):
            raise InvalidDataError(
                f"Expected columns: {GroupTreeDataframeModel._expected_columns()} not found in the grouptree dataframe. "
                f"Columns found: {dataframe.columns}",
                service=Service.GENERAL,
            )

        expected_dtypes = {
            "DATE": pl.Datetime,
            "CHILD": pl.String,
            "PARENT": pl.String,
            "KEYWORD": pl.String,
        }

        for column, expected_dtype in expected_dtypes.items():
            actual_dtype = dataframe[column].dtype
            if actual_dtype != expected_dtype:
                raise InvalidDataError(
                    f"Column '{column}' has incorrect data type. Expected: {expected_dtype}, Got: {actual_dtype}",
                    service=Service.GENERAL,
                )

    @staticmethod
    def has_expected_columns(dataframe: pl.DataFrame) -> bool:
        """
        Verify if the dataframe has the expected columns
        """
        return GroupTreeDataframeModel._expected_columns().issubset(dataframe.columns)

    @staticmethod
    def _expected_columns() -> set[str]:
        """
        List of expected columns in the group tree dataframe
        """
        return {"DATE", "CHILD", "KEYWORD", "PARENT"}

    @property
    def group_tree_wells(self) -> list[str]:
        """
        List of all wells in the group tree dataframe
        """
        return self._grouptree_wells

    @property
    def tree_types(self) -> list[TreeType]:
        """
        List of all tree types in the group tree dataframe
        """
        return self._grouptree_tree_types

    @staticmethod
    def _create_filtered_dataframe(
        grouptree_df: pl.DataFrame,
        terminal_node: str | None = None,
        excl_well_startswith: list[str] | None = None,
        excl_well_endswith: list[str] | None = None,
    ) -> pl.DataFrame:
        """This function returns a sub-set of the rows in the grouptree dataframe
        filtered according to the input arguments

        - terminal_node: returns the terminal node and all nodes below it in the
        tree (for all realizations and dates)
        - excl_well_startswith: removes WELSPECS rows where CHILD starts with any
        of the entries in the list.
        - excl_well_endswith: removes WELSPECS rows where CHILD ends with any
        of the entries in the list.

        """

        # Build mask for rows - default all rows
        num_rows = grouptree_df.height
        mask = pl.Series([True] * num_rows)

        # Filter by terminal node (branch extraction)
        if terminal_node is not None:
            if terminal_node not in grouptree_df["CHILD"].unique().to_list():
                raise NoDataError(
                    f"Terminal node '{terminal_node}' not found in 'CHILD' column of the gruptree data.",
                    Service.GENERAL,
                )
            if terminal_node != "FIELD":
                branch_nodes = GroupTreeDataframeModel._create_branch_node_list(grouptree_df, terminal_node)
                branch_mask = grouptree_df["CHILD"].is_in(branch_nodes)
                mask = mask & branch_mask

        # Filter out wells by prefix
        if excl_well_startswith is not None:
            welspecs_mask = grouptree_df["KEYWORD"] == "WELSPECS"
            # Build exclude mask for any prefix match
            exclude_mask = pl.Series([False] * num_rows)
            for prefix in excl_well_startswith:
                exclude_mask = exclude_mask | grouptree_df["CHILD"].str.starts_with(prefix)
            # Only exclude WELSPECS rows that match the prefixes
            mask = mask & ~(welspecs_mask & exclude_mask)

        # Filter out wells by suffix
        if excl_well_endswith is not None:
            welspecs_mask = grouptree_df["KEYWORD"] == "WELSPECS"
            # Build exclude mask for any suffix match
            exclude_mask = pl.Series([False] * num_rows)
            for suffix in excl_well_endswith:
                exclude_mask = exclude_mask | grouptree_df["CHILD"].str.ends_with(suffix)
            # Only exclude WELSPECS rows that match the suffixes
            mask = mask & ~(welspecs_mask & exclude_mask)

        return grouptree_df.filter(mask)

    @staticmethod
    def _create_branch_node_list(dataframe: pl.DataFrame, terminal_node: str) -> list[str]:
        """
        This function lists all nodes in a branch of the group tree starting from the terminal node.
        """
        branch_node_set = {terminal_node}

        nodes_array = dataframe["CHILD"].to_numpy()
        parents_array = dataframe["PARENT"].to_numpy()

        if terminal_node not in parents_array:
            return list(branch_node_set)

        current_parents = [terminal_node]
        while len(current_parents) > 0:
            # Find all indexes matching the current parents
            children_indices = {i for i, x in enumerate(parents_array) if x in current_parents}

            if not children_indices:
                break

            # Find all children of the current parents
            children = nodes_array[list(children_indices)]
            branch_node_set.update(children)
            current_parents = children.tolist()

        return list(branch_node_set)
