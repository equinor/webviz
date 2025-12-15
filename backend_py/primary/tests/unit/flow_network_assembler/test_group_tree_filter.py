import datetime
import pyarrow as pa
import pytest

from webviz_services.flow_network_assembler._types.network_node_types import TreeType
from webviz_services.flow_network_assembler._utils.group_tree_dataframe_model import (
    GroupTreeDataframeModel,
)


@pytest.fixture
def sample_group_tree_data() -> pa.Table:
    """Create sample data similar to production data with both GRUPTREE and BRANPROP."""
    return pa.table(
        {
            "DATE": pa.array(
                [
                    # First date: Both GRUPTREE and BRANPROP defined
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    datetime.datetime(2032, 12, 1),
                    # Second date: Only BRANPROP redefined
                    datetime.datetime(2036, 7, 1),
                    datetime.datetime(2036, 7, 1),
                    datetime.datetime(2036, 7, 1),
                    datetime.datetime(2036, 7, 1),
                    datetime.datetime(2036, 7, 1),
                ],
                type=pa.timestamp("ms"),
            ),
            "CHILD": [
                # First date
                "FIELD",
                "WIST",
                "WIST_OP",
                "P1_1_LIN",
                "P1_1",  # WELSPEC with parent in GRUPTREE
                "FIELD",
                "RISERB",
                "P1_1_LIN",  # Same well in BRANPROP
                # Second date - only BRANPROP
                "FIELD",
                "RISERB",
                "SUBS_MPP",
                "P1_1_LIN",
                "P1_1",  # WELSPEC - should only be included if parent exists in BRANPROP
            ],
            "KEYWORD": [
                # First date
                "GRUPTREE",
                "GRUPTREE",
                "GRUPTREE",
                "GRUPTREE",
                "WELSPECS",
                "BRANPROP",
                "BRANPROP",
                "BRANPROP",
                # Second date
                "BRANPROP",
                "BRANPROP",
                "BRANPROP",
                "BRANPROP",
                "WELSPECS",
            ],
            "PARENT": [
                # First date
                None,
                "FIELD",
                "WIST",
                "WIST_OP",
                "P1_1_LIN",  # Parent in GRUPTREE
                None,
                "FIELD",
                "RISERB",  # Parent in BRANPROP
                # Second date
                None,
                "FIELD",
                "RISERB",
                "SUBS_MPP",
                "P1_1_LIN",  # Parent in BRANPROP
            ],
        }
    )


def test_gruptree_filtering_excludes_dates_without_gruptree(sample_group_tree_data: pa.Table) -> None:
    """Test that GRUPTREE filtering only includes dates where GRUPTREE is defined."""
    model = GroupTreeDataframeModel(sample_group_tree_data)
    filtered_df = model.create_df_for_tree_type(TreeType.GRUPTREE)

    unique_dates = filtered_df["DATE"].unique().to_list()
    assert len(unique_dates) == 1


def test_gruptree_filtering_excludes_branprop_rows(sample_group_tree_data: pa.Table) -> None:
    """Test that GRUPTREE filtering removes all BRANPROP rows."""
    model = GroupTreeDataframeModel(sample_group_tree_data)
    filtered_df = model.create_df_for_tree_type(TreeType.GRUPTREE)

    branprop_rows = filtered_df.filter(filtered_df["KEYWORD"] == "BRANPROP")
    assert branprop_rows.height == 0


def test_gruptree_filtering_includes_welspecs_with_valid_parent(sample_group_tree_data: pa.Table) -> None:
    """Test that WELSPECS are only included if their parent exists in GRUPTREE."""
    model = GroupTreeDataframeModel(sample_group_tree_data)
    filtered_df = model.create_df_for_tree_type(TreeType.GRUPTREE)

    welspecs_rows = filtered_df.filter(filtered_df["KEYWORD"] == "WELSPECS")
    assert welspecs_rows.height == 1
    assert welspecs_rows["CHILD"][0] == "P1_1"
    assert welspecs_rows["PARENT"][0] == "P1_1_LIN"


def test_branprop_filtering_includes_multiple_dates(sample_group_tree_data: pa.Table) -> None:
    """Test that BRANPROP filtering includes all dates where BRANPROP is defined."""
    model = GroupTreeDataframeModel(sample_group_tree_data)
    filtered_df = model.create_df_for_tree_type(TreeType.BRANPROP)

    unique_dates = filtered_df["DATE"].unique().to_list()
    assert len(unique_dates) == 2


def test_branprop_filtering_excludes_gruptree_rows(sample_group_tree_data: pa.Table) -> None:
    """Test that BRANPROP filtering removes all GRUPTREE rows."""
    model = GroupTreeDataframeModel(sample_group_tree_data)
    filtered_df = model.create_df_for_tree_type(TreeType.BRANPROP)

    gruptree_rows = filtered_df.filter(filtered_df["KEYWORD"] == "GRUPTREE")
    assert gruptree_rows.height == 0


def test_branprop_filtering_includes_welspecs_per_date(sample_group_tree_data: pa.Table) -> None:
    """Test that WELSPECS are only included if their parent exists in BRANPROP at that date."""
    model = GroupTreeDataframeModel(sample_group_tree_data)
    filtered_df = model.create_df_for_tree_type(TreeType.BRANPROP)

    # Check that WELSPECS are present at both dates
    welspecs_rows = filtered_df.filter(filtered_df["KEYWORD"] == "WELSPECS")
    assert welspecs_rows.height == 2


def test_model_extracts_wells(sample_group_tree_data: pa.Table) -> None:
    """Test that the model correctly extracts wells from WELSPECS."""
    model = GroupTreeDataframeModel(sample_group_tree_data)

    # Wells are from WELSPECS
    assert "P1_1" in model.group_tree_wells
    assert len(model.group_tree_wells) == 1


def test_model_detects_tree_types(sample_group_tree_data: pa.Table) -> None:
    """Test that the model correctly detects both tree types."""
    model = GroupTreeDataframeModel(sample_group_tree_data)

    # Should detect both GRUPTREE and BRANPROP
    assert TreeType.GRUPTREE in model.tree_types
    assert TreeType.BRANPROP in model.tree_types
    assert len(model.tree_types) == 2


def test_empty_dataframe_raises_error() -> None:
    """Test that an empty DataFrame raises InvalidDataError."""
    from webviz_services.service_exceptions import InvalidDataError

    empty_table = pa.table(
        {
            "DATE": pa.array([], type=pa.timestamp("ms")),
            "CHILD": pa.array([], type=pa.string()),
            "KEYWORD": pa.array([], type=pa.string()),
            "PARENT": pa.array([], type=pa.string()),
        }
    )

    with pytest.raises(InvalidDataError, match="The group tree dataframe is empty"):
        GroupTreeDataframeModel(empty_table)


def test_missing_required_column_raises_error() -> None:
    """Test that missing a required column raises InvalidDataError."""
    from webviz_services.service_exceptions import InvalidDataError

    # Missing PARENT column
    incomplete_table = pa.table(
        {
            "DATE": pa.array([datetime.datetime(2032, 12, 1)], type=pa.timestamp("ms")),
            "CHILD": ["FIELD"],
            "KEYWORD": ["GRUPTREE"],
        }
    )

    with pytest.raises(
        InvalidDataError,
        match=r"Expected columns:.*not found in the grouptree dataframe",
    ):
        GroupTreeDataframeModel(incomplete_table)
