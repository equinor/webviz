import pytest
import polars as pl
from primary.services.service_exceptions import InvalidDataError
from primary.services.sumo_access.inplace_volumes_table_types import InplaceVolumes

from primary.services.inplace_volumes_table_assembler._utils.inplace_volumes_df_utils import (
    create_inplace_volumes_df_per_unique_fluid_value,
    remove_invalid_optional_index_columns,
    sum_inplace_volumes_grouped_by_indices_and_real_df,
    validate_inplace_volumes_df_selector_columns,
)


def test_validate_inplace_volumes_df_selector_columns_with_valid_columns() -> None:
    # Create a DataFrame with all required columns
    required_columns = InplaceVolumes.required_index_columns()
    data = {col: [1] for col in required_columns}
    data["REAL"] = [1]  # Add REAL column which is also required
    data["STOIIP"] = [100]  # Add some volume columns

    df = pl.DataFrame(data)

    # This should not raise any exceptions
    validate_inplace_volumes_df_selector_columns(df)


def test_validate_inplace_volumes_df_selector_columns_missing_required_index_columns() -> None:
    # Create a DataFrame without required index columns
    data = {"ZONE": ["A"], "REAL": [1], "STOIIP": [100]}
    df = pl.DataFrame(data)

    # This should raise InvalidDataError
    with pytest.raises(InvalidDataError) as excinfo:
        validate_inplace_volumes_df_selector_columns(df)

    assert "Missing required index columns" in str(excinfo.value)


def test_validate_inplace_volumes_df_selector_columns_missing_real_column() -> None:
    # Create a DataFrame with required index columns but without REAL
    required_columns = InplaceVolumes.required_index_columns()
    data = {col: [1] for col in required_columns}
    data["STOIIP"] = [100]

    df = pl.DataFrame(data)

    # This should raise InvalidDataError
    with pytest.raises(InvalidDataError) as excinfo:
        validate_inplace_volumes_df_selector_columns(df)

    assert "The 'REAL' column is missing" in str(excinfo.value)


def test_sum_inplace_volumes_grouped_by_indices_and_real_df_with_group_by() -> None:

    # Create test data
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "oil", "oil", "gas", "gas", "gas", "gas"],
            "ZONE": ["A", "A", "B", "B", "A", "A", "B", "B"],
            "REGION": ["X", "Y", "X", "X", "Y", "Y", "X", "Y"],
            "REAL": [1, 2, 1, 2, 1, 2, 1, 2],
            "STOIIP": [250, 200, 70, 80, 50, 30, 150, 200],
            "GIIP": [25, 20, 150, 200, 100, 50, 15, 30],
        }
    )

    # Test grouping by ZONE
    result_df = sum_inplace_volumes_grouped_by_indices_and_real_df(input_df, [InplaceVolumes.TableIndexColumns.ZONE])

    # Define expected DataFrame
    expected_df = pl.DataFrame(
        {
            "ZONE": ["A", "A", "B", "B"],
            "REAL": [1, 2, 1, 2],
            "STOIIP": [300, 230, 220, 280],
            "GIIP": [125, 70, 165, 230],
        }
    )

    # Sort result_df and select columns in the expected order
    result_df = result_df.sort(["ZONE", "REAL"]).select(["ZONE", "REAL", "STOIIP", "GIIP"])

    # Compare sorted results
    assert expected_df.equals(result_df.sort(["ZONE", "REAL"]))


def test_sum_inplace_volumes_grouped_by_indices_and_real_df_with_multiple_indices() -> None:

    # Create test data
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "oil", "oil", "gas", "gas", "gas", "gas"],
            "ZONE": ["A", "A", "B", "B", "A", "A", "B", "B"],
            "REGION": ["X", "Y", "X", "X", "Y", "Y", "X", "Y"],
            "REAL": [1, 2, 1, 2, 1, 2, 1, 2],
            "STOIIP": [250, 200, 80, 70, 50, 30, 150, 200],
            "GIIP": [25, 20, 150, 200, 100, 50, 15, 30],
        }
    )

    # Test grouping by multiple indices
    result_df = sum_inplace_volumes_grouped_by_indices_and_real_df(
        input_df, [InplaceVolumes.TableIndexColumns.FLUID, InplaceVolumes.TableIndexColumns.REGION]
    )

    # Define expected DataFrame
    expected_df = pl.DataFrame(
        {
            "FLUID": ["gas", "gas", "gas", "oil", "oil", "oil"],
            "REGION": ["X", "Y", "Y", "X", "X", "Y"],
            "REAL": [1, 1, 2, 1, 2, 2],
            "STOIIP": [150, 50, 230, 330, 70, 200],
            "GIIP": [15, 100, 80, 175, 200, 20],
        }
    )

    # Sort result_df and reorder columns
    result_df = result_df.sort(["FLUID", "REGION", "REAL"]).select(["FLUID", "REGION", "REAL", "STOIIP", "GIIP"])

    # Compare sorted results
    assert expected_df.equals(result_df)


def test_sum_inplace_volumes_grouped_by_indices_and_real_df_without_group_by() -> None:

    # Create test data
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas", "gas"],
            "REAL": [1, 2, 1, 2],
            "STOIIP": [100, 200, 50, 70],
            "GIIP": [10, 20, 100, 200],
        }
    )

    # Test with no grouping indices (only by REAL)
    result_df = sum_inplace_volumes_grouped_by_indices_and_real_df(input_df, None)

    # Define expected DataFrame
    expected_df = pl.DataFrame({"REAL": [1, 2], "STOIIP": [150, 270], "GIIP": [110, 220]})

    # Compare sorted results
    assert expected_df.equals(result_df.sort("REAL"))


def test_sum_inplace_volumes_grouped_by_indices_and_real_df_missing_columns() -> None:

    # Create test data with missing REAL column
    input_df = pl.DataFrame({"FLUID": ["oil", "gas"], "ZONE": ["A", "B"], "STOIIP": [100, 50]})

    # Test with missing required column
    with pytest.raises(ValueError) as excinfo:
        sum_inplace_volumes_grouped_by_indices_and_real_df(input_df, [InplaceVolumes.TableIndexColumns.ZONE])

    assert "Missing required selector columns" in str(excinfo.value)
    assert "REAL" in str(excinfo.value)


def test_create_inplace_volumes_df_per_unique_fluid_value_basic() -> None:
    # Create a test DataFrame with multiple fluid values
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas", "gas"],
            "ZONE": ["A", "B", "A", "B"],
            "REAL": [1, 2, 1, 2],
            "STOIIP": [100, 200, 50, 70],
            "GIIP": [10, 20, 100, 200],
        }
    )

    # Call the function
    result_dict = create_inplace_volumes_df_per_unique_fluid_value(input_df)

    # Check the result contains the expected fluid keys
    assert set(result_dict.keys()) == {"oil", "gas"}

    # Create expected DataFrames
    expected_oil_df = pl.DataFrame(
        {
            "ZONE": ["A", "B"],
            "REAL": [1, 2],
            "STOIIP": [100, 200],
            "GIIP": [10, 20],
        }
    )

    expected_gas_df = pl.DataFrame(
        {
            "ZONE": ["A", "B"],
            "REAL": [1, 2],
            "STOIIP": [50, 70],
            "GIIP": [100, 200],
        }
    )

    # Compare with expected DataFrames
    assert result_dict["oil"].equals(expected_oil_df)
    assert result_dict["gas"].equals(expected_gas_df)


def test_create_inplace_volumes_df_per_unique_fluid_value_missing_fluid_column() -> None:
    # Test with DataFrame that's missing the FLUID column
    input_df = pl.DataFrame(
        {
            "ZONE": ["A", "B"],
            "REAL": [1, 2],
            "STOIIP": [100, 200],
        }
    )

    # This should raise ValueError
    with pytest.raises(ValueError) as excinfo:
        create_inplace_volumes_df_per_unique_fluid_value(input_df)

    assert "FLUID column is required" in str(excinfo.value)


def test_create_inplace_volumes_df_per_unique_fluid_value_single_fluid() -> None:
    # Test with DataFrame containing only one fluid type
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "oil"],
            "ZONE": ["A", "B", "C"],
            "REAL": [1, 2, 3],
            "STOIIP": [100, 200, 300],
        }
    )

    result = create_inplace_volumes_df_per_unique_fluid_value(input_df)

    # Expected DataFrame for the single fluid type, without fluid column
    expected_oil_df = pl.DataFrame(
        {
            "ZONE": ["A", "B", "C"],
            "REAL": [1, 2, 3],
            "STOIIP": [100, 200, 300],
        }
    )

    assert len(result) == 1
    assert "oil" in result
    assert result["oil"].equals(expected_oil_df)


def test_remove_invalid_optional_index_columns_with_null_column() -> None:
    # Optional index columns: FACIES and LICENSE
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas"],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "FACIES": [None, None, None],  # All null values
        }
    )

    # Call the function
    result_df = remove_invalid_optional_index_columns(input_df)

    alphabetical_ordered_columns = sorted(result_df.columns)

    # Expect FACIES to be removed
    assert alphabetical_ordered_columns == ["FLUID", "REGION", "ZONE"]


def test_remove_invalid_optional_index_columns_with_nan_column() -> None:
    # Optional index columns: FACIES and LICENSE
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas"],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "FACIES": [float("nan"), float("nan"), float("nan")],  # All nan values
        }
    )

    # Call the function
    result_df = remove_invalid_optional_index_columns(input_df)

    alphabetical_ordered_columns = sorted(result_df.columns)

    # Expect FACIES to be removed
    assert alphabetical_ordered_columns == ["FLUID", "REGION", "ZONE"]


def test_remove_invalid_optional_index_columns_no_invalid_columns() -> None:
    # Optional index columns: FACIES and LICENSE
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas"],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "FACIES": ["F1", "F1", "F1"],  # All valid values
        }
    )

    # Call the function
    result_df = remove_invalid_optional_index_columns(input_df)

    # All columns should remain
    assert result_df.equals(input_df)


def test_remove_invalid_optional_index_columns_mixed_values() -> None:
    # Optional index columns: FACIES and LICENSE
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas"],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "FACIES": ["F1", None, "F1"],  # Partially valid values
        }
    )

    # Call the function
    result_df = remove_invalid_optional_index_columns(input_df)

    # All columns should remain
    assert result_df.equals(input_df)


def test_remove_invalid_optional_index_columns_non_index_columns_untouched() -> None:
    # Create a DataFrame with invalid non-index columns
    input_df = pl.DataFrame(
        {
            "FLUID": ["oil", "oil", "gas"],
            "ZONE": ["A", "B", "C"],
            "REGION": ["X", "Y", "Z"],
            "NON_INDEX_COLUMN": [None, None, None],  # Not an index column, should be left alone
        }
    )

    # Call the function
    result_df = remove_invalid_optional_index_columns(input_df)

    # Non-index column should remain even if invalid
    assert "NON_INDEX_COLUMN" in result_df.columns
