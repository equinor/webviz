from typing import List
import pytest
import polars as pl
import numpy as np

from primary.services.sumo_access.inplace_volumetrics_types import (
    RepeatedTableColumnData,
    Statistic,
    TableColumnStatisticalData,
)

from primary.services.inplace_volumetrics_assembler._utils import (
    _create_named_expression_with_nan_for_inf,
    _create_repeated_table_column_data_from_polars_column,
    _create_statistical_expression,
    _create_statistic_aggregation_expressions,
    _get_statistical_function_expression,
    get_valid_result_names_from_list,
    _validate_length_of_statistics_data_lists,
)


def test_get_valid_result_names_from_list() -> None:
    """
    Valid result names are found in InplaceVolumetricResultName enum.
    """

    requested_result_names = [
        "STOIIP",
        "GIIP",
        "FIRST_INVALID_RESULT_NAME",
        "NTG",
        "BG",
        "SW",
        "SECOND_INVALID_RESULT_NAME",
    ]

    # Valid result names from InplaceVolumetricResultName enum
    exepected_valid_result_names = ["STOIIP", "GIIP", "NTG", "BG", "SW"]
    valid_result_names = get_valid_result_names_from_list(requested_result_names)

    assert valid_result_names == exepected_valid_result_names


def test_get_statistical_function_expression() -> None:
    test_col = pl.col("Test Column")

    # Get the statistical functions
    mean_func = _get_statistical_function_expression(Statistic.MEAN)
    min_func = _get_statistical_function_expression(Statistic.MIN)
    max_func = _get_statistical_function_expression(Statistic.MAX)
    std_dev_func = _get_statistical_function_expression(Statistic.STD_DEV)
    p10_func = _get_statistical_function_expression(Statistic.P10)
    p90_func = _get_statistical_function_expression(Statistic.P90)

    # Assert the functions are not None
    assert mean_func is not None
    assert min_func is not None
    assert max_func is not None
    assert std_dev_func is not None
    assert p10_func is not None
    assert p90_func is not None

    # Assert the expressions are correct
    assert mean_func(test_col).meta.eq(test_col.mean())
    assert min_func(test_col).meta.eq(test_col.min())
    assert max_func(test_col).meta.eq(test_col.max())
    assert std_dev_func(test_col).meta.eq(test_col.std())
    assert p10_func(test_col).meta.eq(test_col.quantile(0.9, "linear"))
    assert p90_func(test_col).meta.eq(test_col.quantile(0.1, "linear"))


def test_create_statistical_expression_drop_nans() -> None:
    expr_mean = pl.col("Test Column").drop_nans().mean().alias(f"Test Column_{Statistic.MEAN.value}")
    expr_min = pl.col("Test Column").drop_nans().min().alias(f"Test Column_{Statistic.MIN.value}")
    expr_max = pl.col("Test Column").drop_nans().max().alias(f"Test Column_{Statistic.MAX.value}")
    expr_std_dev = pl.col("Test Column").drop_nans().std().alias(f"Test Column_{Statistic.STD_DEV.value}")
    expr_p10 = pl.col("Test Column").drop_nans().quantile(0.9, "linear").alias(f"Test Column_{Statistic.P10.value}")
    expr_p90 = pl.col("Test Column").drop_nans().quantile(0.1, "linear").alias(f"Test Column_{Statistic.P90.value}")

    assert _create_statistical_expression(Statistic.MEAN, "Test Column").meta.eq(expr_mean)
    assert _create_statistical_expression(Statistic.MIN, "Test Column").meta.eq(expr_min)
    assert _create_statistical_expression(Statistic.MAX, "Test Column").meta.eq(expr_max)
    assert _create_statistical_expression(Statistic.STD_DEV, "Test Column").meta.eq(expr_std_dev)
    assert _create_statistical_expression(Statistic.P10, "Test Column").meta.eq(expr_p10)
    assert _create_statistical_expression(Statistic.P90, "Test Column").meta.eq(expr_p90)


def test_create_statistical_expression_keep_nans() -> None:
    expr_mean = pl.col("Test Column").mean().alias(f"Test Column_{Statistic.MEAN.value}")
    expr_min = pl.col("Test Column").min().alias(f"Test Column_{Statistic.MIN.value}")
    expr_max = pl.col("Test Column").max().alias(f"Test Column_{Statistic.MAX.value}")
    expr_std_dev = pl.col("Test Column").std().alias(f"Test Column_{Statistic.STD_DEV.value}")
    expr_p10 = pl.col("Test Column").quantile(0.9, "linear").alias(f"Test Column_{Statistic.P10.value}")
    expr_p90 = pl.col("Test Column").quantile(0.1, "linear").alias(f"Test Column_{Statistic.P90.value}")

    assert _create_statistical_expression(Statistic.MEAN, "Test Column", False).meta.eq(expr_mean)
    assert _create_statistical_expression(Statistic.MIN, "Test Column", False).meta.eq(expr_min)
    assert _create_statistical_expression(Statistic.MAX, "Test Column", False).meta.eq(expr_max)
    assert _create_statistical_expression(Statistic.STD_DEV, "Test Column", False).meta.eq(expr_std_dev)
    assert _create_statistical_expression(Statistic.P10, "Test Column", False).meta.eq(expr_p10)
    assert _create_statistical_expression(Statistic.P90, "Test Column", False).meta.eq(expr_p90)


def test_create_statistic_aggregation_expressions() -> None:
    result_columns = ["column1", "column2"]
    statistics = [Statistic.MEAN, Statistic.MIN, Statistic.MAX]

    expressions = _create_statistic_aggregation_expressions(result_columns, statistics)

    assert len(expressions) == len(result_columns) * len(statistics)
    assert expressions[0].meta.eq(pl.col("column1").drop_nans().mean().alias(f"column1_{Statistic.MEAN.value}"))
    assert expressions[1].meta.eq(pl.col("column1").drop_nans().min().alias(f"column1_{Statistic.MIN.value}"))
    assert expressions[2].meta.eq(pl.col("column1").drop_nans().max().alias(f"column1_{Statistic.MAX.value}"))
    assert expressions[3].meta.eq(pl.col("column2").drop_nans().mean().alias(f"column2_{Statistic.MEAN.value}"))
    assert expressions[4].meta.eq(pl.col("column2").drop_nans().min().alias(f"column2_{Statistic.MIN.value}"))
    assert expressions[5].meta.eq(pl.col("column2").drop_nans().max().alias(f"column2_{Statistic.MAX.value}"))


def test_create_statistic_aggregation_expressions_with_drop_nans() -> None:
    result_columns = ["column1"]
    statistics = [Statistic.STD_DEV, Statistic.P10, Statistic.P90]

    expressions = _create_statistic_aggregation_expressions(result_columns, statistics, drop_nans=True)
    expected_expressions = [
        pl.col("column1").drop_nans().std().alias(f"column1_{Statistic.STD_DEV.value}"),
        pl.col("column1").drop_nans().quantile(0.9, "linear").alias(f"column1_{Statistic.P10.value}"),
        pl.col("column1").drop_nans().quantile(0.1, "linear").alias(f"column1_{Statistic.P90.value}"),
    ]

    assert len(expressions) == len(expected_expressions)
    assert expressions[0].meta.eq(pl.col("column1").drop_nans().std().alias(f"column1_{Statistic.STD_DEV.value}"))
    assert expressions[1].meta.eq(
        pl.col("column1").drop_nans().quantile(0.9, "linear").alias(f"column1_{Statistic.P10.value}")
    )
    assert expressions[2].meta.eq(
        pl.col("column1").drop_nans().quantile(0.1, "linear").alias(f"column1_{Statistic.P90.value}")
    )


def test_create_statistic_aggregation_expressions_without_drop_nans() -> None:
    result_columns = ["column1"]
    statistics = [Statistic.STD_DEV, Statistic.P10, Statistic.P90]

    expressions = _create_statistic_aggregation_expressions(result_columns, statistics, drop_nans=False)

    assert len(expressions) == len(result_columns) * len(statistics)
    assert expressions[0].meta.eq(pl.col("column1").std().alias(f"column1_{Statistic.STD_DEV.value}"))
    assert expressions[1].meta.eq(pl.col("column1").quantile(0.9, "linear").alias(f"column1_{Statistic.P10.value}"))
    assert expressions[2].meta.eq(pl.col("column1").quantile(0.1, "linear").alias(f"column1_{Statistic.P90.value}"))


def test_create_statistic_aggregation_expressions_empty_columns() -> None:
    result_columns: List[str] = []
    statistics = [Statistic.MEAN, Statistic.MIN, Statistic.MAX]

    expressions = _create_statistic_aggregation_expressions(result_columns, statistics)

    assert len(expressions) == 0


def test_create_statistic_aggregation_expressions_empty_statistics() -> None:
    result_columns = ["column1", "column2"]
    statistics: List[Statistic] = []

    expressions = _create_statistic_aggregation_expressions(result_columns, statistics)

    assert len(expressions) == 0


def test_validate_length_of_statistics_data_lists_equal_lengths() -> None:
    selector_column_data_list = [
        RepeatedTableColumnData(column_name="selector1", unique_values=[1, 2], indices=[0, 1, 0])
    ]
    result_statistical_data_list = [
        TableColumnStatisticalData(
            column_name="result1",
            statistic_values={Statistic.MEAN: [1.0, 2.0, 1.5], Statistic.STD_DEV: [0.1, 0.2, 0.15]},
        )
    ]
    # Should not raise any exception
    _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)


def test_validate_length_of_statistics_data_lists_empty_lists() -> None:
    selector_column_data_list: List[RepeatedTableColumnData] = []
    result_statistical_data_list: List[TableColumnStatisticalData] = []
    # Should not raise any exception
    _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)


def test_validate_length_of_statistics_data_lists_mismatched_lengths_selector_vs_statistic() -> None:
    selector_column_data_list = [RepeatedTableColumnData(column_name="selector1", unique_values=[1, 2], indices=[0, 1])]
    result_statistical_data_list = [
        TableColumnStatisticalData(
            column_name="result1",
            statistic_values={Statistic.MEAN: [1.0, 2.0, 1.5], Statistic.STD_DEV: [0.1, 0.2, 0.15]},
        )
    ]
    with pytest.raises(
        ValueError, match="Number of result1 statistic mean values does not match expected number of rows: 2. Got: 3"
    ):
        _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)


def test_validate_length_of_statistics_data_lists_mismatched_lengths_selector_vs_selector() -> None:
    selector_column_data_list = [
        RepeatedTableColumnData(column_name="selector1", unique_values=[1, 2], indices=[0, 1]),
        RepeatedTableColumnData(column_name="selector2", unique_values=[1, 2, 3], indices=[0, 1, 2]),
    ]
    result_statistical_data_list = [
        TableColumnStatisticalData(
            column_name="result1",
            statistic_values={Statistic.MEAN: [1.0, 2.0, 1.5]},
        )
    ]
    with pytest.raises(
        ValueError, match="Length of selector2 column data list does not match expected number of rows: 2. Got: 3"
    ):
        _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)


def test_validate_length_of_statistics_data_lists_mismatched_lengths_statistic() -> None:
    selector_column_data_list = [
        RepeatedTableColumnData(column_name="selector1", unique_values=[1, 2], indices=[0, 1, 0])
    ]
    result_statistical_data_list = [
        TableColumnStatisticalData(
            column_name="result1", statistic_values={Statistic.MEAN: [1.0, 2.0], Statistic.STD_DEV: [0.1, 0.2, 0.15]}
        )
    ]
    with pytest.raises(
        ValueError, match="Number of result1 statistic mean values does not match expected number of rows: 3. Got: 2"
    ):
        _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)


def test_create_repeated_table_column_data_from_polars_number_column() -> None:
    # Test case 1: Basic functionality
    column_name = "test_column"
    column_values = [1, 3, 3, 2, 1]
    expected_sorted_unique_values = [1, 2, 3]

    result = _create_repeated_table_column_data_from_polars_column(column_name, pl.Series(column_values))

    # Build the result values
    result_values = [result.unique_values[i] for i in result.indices]

    # Note: unique() method might not preserve the order of the unique values, thus we sort the unique values for comparison
    # and build the result_values list to compare with the original values
    assert result.column_name == column_name
    assert sorted(result.unique_values) == expected_sorted_unique_values
    assert result_values == column_values


def test_create_repeated_table_column_data_from_polars_string_column() -> None:
    # Test case 2: String values
    column_name = "string_column"
    column_values = ["a", "b", "a", "c", "b"]
    expected_sorted_unique_values = ["a", "b", "c"]

    result = _create_repeated_table_column_data_from_polars_column(column_name, pl.Series(column_values))

    # Build the result values
    result_values = [result.unique_values[i] for i in result.indices]

    # Note: unique() method might not preserve the order of the unique values, thus we sort the unique values for comparison
    # and build the result_values list to compare with the original values
    assert result.column_name == column_name
    assert sorted(result.unique_values) == expected_sorted_unique_values
    assert result_values == column_values


def test_create_repeated_table_column_data_from_polars_empty_column() -> None:
    # Test case 3: Empty column
    column_name = "empty_column"
    column_values = pl.Series([])
    expected_unique_values: List[str | int] = []
    expected_indices: List[int] = []

    result = _create_repeated_table_column_data_from_polars_column(column_name, column_values)

    assert result.column_name == column_name
    assert result.unique_values == expected_unique_values
    assert result.indices == expected_indices


def test_create_repeated_table_column_data_from_polars_single_value_column() -> None:
    # Test case 4: Single value column
    column_name = "single_value_column"
    column_values = pl.Series([42, 42, 42])
    expected_unique_values = [42]
    expected_indices = [0, 0, 0]

    result = _create_repeated_table_column_data_from_polars_column(column_name, column_values)

    assert result.column_name == column_name
    assert result.unique_values == expected_unique_values
    assert result.indices == expected_indices


def test_create_named_expression_with_nan_for_inf() -> None:
    # Create a Polars DataFrame with some test data
    df = pl.DataFrame({"values": [1.0, 2.0, np.inf, -np.inf, 5.0]})

    # Apply the function to create the expression
    expr = _create_named_expression_with_nan_for_inf(pl.col("values"), "values_with_nan")

    # Evaluate the expression
    result_df: pl.DataFrame = df.with_columns(expr)

    # Expected result
    expected_values = [1.0, 2.0, np.nan, np.nan, 5.0]

    # Assert the results (need np.testing.assert_array_equal for NaN comparison)
    values_with_nan_column = result_df.get_column("values_with_nan").to_list()
    np.testing.assert_array_equal(values_with_nan_column, expected_values)
