import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import create_inplace_volumetric_table_data_from_result_df


def test_create_inplace_volumetric_table_data_from_result_df() -> None:
    # Test case 1: Basic functionality
    result_df = pl.DataFrame(
        {
            "REAL": [1, 2, 3],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "FACIES": ["F1", "F2", "F3"],
            "STOIIP": [100, 200, 300],
            "GIIP": [400, 500, 600],
        }
    )
    selection_name = "test_selection"

    result = create_inplace_volumetric_table_data_from_result_df(result_df, selection_name)

    assert result.fluid_selection_name == selection_name
    assert len(result.selector_columns) == 4
    assert len(result.result_columns) == 2


def test_create_inplace_volumetric_table_data_from_result_df_no_selector_columns() -> None:
    # Test case 2: No selector columns
    result_df = pl.DataFrame({"STOIIP": [100, 200, 300], "GIIP": [400, 500, 600]})
    selection_name = "test_selection_no_selector"

    result = create_inplace_volumetric_table_data_from_result_df(result_df, selection_name)

    assert result.fluid_selection_name == selection_name
    assert len(result.selector_columns) == 0
    assert len(result.result_columns) == 2


def test_create_inplace_volumetric_table_data_from_result_df_no_result_columns() -> None:
    # Test case 3: No result columns
    result_df = pl.DataFrame(
        {"REAL": [1, 2, 3], "ZONE": ["A", "B", "C"], "REGION": ["X", "Y", "Z"], "FACIES": ["F1", "F2", "F3"]}
    )
    selection_name = "test_selection_no_result"

    result = create_inplace_volumetric_table_data_from_result_df(result_df, selection_name)

    assert result.fluid_selection_name == selection_name
    assert len(result.selector_columns) == 4
    assert len(result.result_columns) == 0


def test_create_inplace_volumetric_table_data_from_result_df_empty_df() -> None:
    # Test case 4: Empty DataFrame
    result_df = pl.DataFrame()
    selection_name = "test_selection_empty"

    result = create_inplace_volumetric_table_data_from_result_df(result_df, selection_name)

    assert result.fluid_selection_name == selection_name
    assert len(result.selector_columns) == 0
    assert len(result.result_columns) == 0
