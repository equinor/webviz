#!/usr/bin/env python3
"""
Test script to verify the group tree filtering logic works correctly.
"""

import pandas as pd
from webviz_services.sumo_access.group_tree_types import TreeType
from webviz_services.flow_network_assembler._group_tree_dataframe_model import (
    GroupTreeDataframeModel,
)


def create_sample_data():
    """Create sample data similar to the user's file."""
    data = {
        "DATE": [
            # First date: Both GRUPTREE and BRANPROP defined
            "2032-12-01",
            "2032-12-01",
            "2032-12-01",
            "2032-12-01",
            "2032-12-01",
            "2032-12-01",
            "2032-12-01",
            "2032-12-01",
            # Second date: Only BRANPROP redefined
            "2036-07-01",
            "2036-07-01",
            "2036-07-01",
            "2036-07-01",
            "2036-07-01",
        ],
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
    return pd.DataFrame(data)


def test_gruptree_filtering():
    """Test GRUPTREE filtering."""
    print("=" * 80)
    print("Testing GRUPTREE filtering")
    print("=" * 80)

    df = create_sample_data()
    print("\nOriginal data:")
    print(df.to_string())

    # Create model with GRUPTREE
    model = GroupTreeDataframeModel(df, TreeType.GRUPTREE)
    filtered_df = model.dataframe

    print("\n\nFiltered data for GRUPTREE:")
    print(filtered_df.to_string())

    # Verify expectations
    print("\n\nVerifications:")
    unique_dates = filtered_df["DATE"].unique()
    print(f"✓ Unique dates in filtered data: {unique_dates}")
    print(f"  Expected: Only ['2032-12-01'] (date where GRUPTREE is defined)")

    branprop_rows = filtered_df[filtered_df["KEYWORD"] == "BRANPROP"]
    print(f"✓ BRANPROP rows: {len(branprop_rows)}")
    print(f"  Expected: 0 (BRANPROP should be filtered out)")

    welspecs_at_first_date = filtered_df[
        (filtered_df["DATE"] == "2032-12-01") & (filtered_df["KEYWORD"] == "WELSPECS")
    ]
    print(f"✓ WELSPECS at 2032-12-01: {len(welspecs_at_first_date)}")
    print(f"  WELSPECS children: {welspecs_at_first_date['CHILD'].tolist()}")
    print(f"  Expected: Only wells whose parent exists in GRUPTREE")

    second_date_rows = filtered_df[filtered_df["DATE"] == "2036-07-01"]
    print(f"✓ Rows at 2036-07-01: {len(second_date_rows)}")
    print(f"  Expected: 0 (no GRUPTREE definition at this date)")


def test_branprop_filtering():
    """Test BRANPROP filtering."""
    print("\n\n" + "=" * 80)
    print("Testing BRANPROP filtering")
    print("=" * 80)

    df = create_sample_data()

    # Create model with BRANPROP
    model = GroupTreeDataframeModel(df, TreeType.BRANPROP)
    filtered_df = model.dataframe

    print("\n\nFiltered data for BRANPROP:")
    print(filtered_df.to_string())

    # Verify expectations
    print("\n\nVerifications:")
    unique_dates = filtered_df["DATE"].unique()
    print(f"✓ Unique dates in filtered data: {sorted(unique_dates)}")
    print(f"  Expected: ['2032-12-01', '2036-07-01'] (dates where BRANPROP is defined)")

    gruptree_rows = filtered_df[filtered_df["KEYWORD"] == "GRUPTREE"]
    print(f"✓ GRUPTREE rows: {len(gruptree_rows)}")
    print(f"  Expected: 0 (GRUPTREE should be filtered out)")

    welspecs_at_first_date = filtered_df[
        (filtered_df["DATE"] == "2032-12-01") & (filtered_df["KEYWORD"] == "WELSPECS")
    ]
    print(f"✓ WELSPECS at 2032-12-01: {len(welspecs_at_first_date)}")
    print(f"  WELSPECS children: {welspecs_at_first_date['CHILD'].tolist()}")

    welspecs_at_second_date = filtered_df[
        (filtered_df["DATE"] == "2036-07-01") & (filtered_df["KEYWORD"] == "WELSPECS")
    ]
    print(f"✓ WELSPECS at 2036-07-01: {len(welspecs_at_second_date)}")
    print(f"  WELSPECS children: {welspecs_at_second_date['CHILD'].tolist()}")
    print(f"  Expected: Only wells whose parent exists in BRANPROP at that date")


if __name__ == "__main__":
    try:
        test_gruptree_filtering()
        test_branprop_filtering()
        print("\n\n" + "=" * 80)
        print("✓ All tests completed!")
        print("=" * 80)
    except Exception as e:
        print(f"\n\n✗ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
