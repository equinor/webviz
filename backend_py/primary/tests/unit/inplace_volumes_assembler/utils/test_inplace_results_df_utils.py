import polars as pl
import pytest

from primary.services.service_exceptions import InvalidDataError
from primary.services.inplace_volumes_table_assembler._utils.inplace_results_df_utils import (
    create_per_fluid_results_df,
    create_statistical_result_table_data_from_df,
    _convert_statistical_results_df_to_statistical_results_table_data,
    _create_statistic_aggregation_expressions,
    _create_statistical_expression,
    _get_statistical_function_expression,
    _validate_length_of_statistics_data_lists,
)
from primary.services.sumo_access.inplace_volumes_table_types import (
    CategorizedResultNames,
    RepeatedTableColumnData,
    Statistic,
    TableColumnStatisticalData,
)


class TestCreatePerFluidResultsDf:
    @pytest.fixture
    def volumetric_df(self) -> pl.DataFrame:
        return pl.DataFrame(
            {
                "ZONE": ["A", "A", "B", "B", "A", "A", "B", "B"],
                "REGION": ["X", "Y", "X", "X", "Y", "Y", "X", "Y"],
                "REAL": [1, 2, 1, 2, 1, 2, 1, 2],
                "STOIIP": [250, 200, 70, 80, 50, 30, 150, 200],
                "ASSOCIATEDOIL": [100, 80, 20, 30, 10, 5, 15, 20],
                "GIIP": [25, 20, 150, 200, 100, 50, 15, 30],
                "HCPV": [300, 250, 100, 120, 60, 40, 180, 240],
                "PORV": [500, 400, 200, 240, 120, 80, 360, 480],
            }
        )

    @pytest.fixture
    def categorized_result_names(self) -> CategorizedResultNames:
        return CategorizedResultNames(
            volume_names=["STOIIP"], calculated_volume_names=["STOIIP_TOTAL"], property_names=["BG", "SW"]
        )

    def test_create_per_fluid_results_df_fluid_column_throw_error(self, volumetric_df, categorized_result_names):
        fluid_columns = ["oil", "oil", "oil", "oil", "gas", "gas", "gas", "gas"]
        df_with_fluid_column = volumetric_df.with_columns(pl.Series("FLUID", fluid_columns))

        # Throw error when DataFrame contains FLUID column
        with pytest.raises(
            InvalidDataError,
            match="The DataFrame should not contain FLUID column when DataFrame is per unique fluid value",
        ):
            create_per_fluid_results_df(df_with_fluid_column, categorized_result_names, "gas")

    def test_create_per_fluid_results_df_for_oil(self, volumetric_df, categorized_result_names):
        # Call the function
        result_df = create_per_fluid_results_df(volumetric_df, categorized_result_names, "oil")

        # SW = 1 - HCPV/PORV
        expected_sw = pl.Series(
            [
                1 - 300 / 500,
                1 - 250 / 400,
                1 - 100 / 200,
                1 - 120 / 240,
                1 - 60 / 120,
                1 - 40 / 80,
                1 - 180 / 360,
                1 - 240 / 480,
            ]
        )

        # Check that the result DataFrame has the expected columns
        assert list(result_df.columns) == ["ZONE", "REGION", "REAL", "STOIIP", "STOIIP_TOTAL", "SW"]
        assert result_df["STOIIP"].equals(volumetric_df["STOIIP"])
        assert result_df["STOIIP_TOTAL"].equals(volumetric_df["STOIIP"])  # For oil
        assert result_df["SW"].equals(expected_sw)

    def test_create_per_fluid_results_df_for_gas(self, volumetric_df, categorized_result_names):
        # Call the function
        result_df = create_per_fluid_results_df(volumetric_df, categorized_result_names, "gas")

        # SW = 1 - HCPV/PORV
        expected_sw = pl.Series(
            [
                1 - 300 / 500,
                1 - 250 / 400,
                1 - 100 / 200,
                1 - 120 / 240,
                1 - 60 / 120,
                1 - 40 / 80,
                1 - 180 / 360,
                1 - 240 / 480,
            ]
        )

        # BG = HCPV/GIIP
        expected_bg = pl.Series([300 / 25, 250 / 20, 100 / 150, 120 / 200, 60 / 100, 40 / 50, 180 / 15, 240 / 30])

        # Check that the result DataFrame has the expected columns
        assert list(result_df.columns) == ["ZONE", "REGION", "REAL", "STOIIP", "STOIIP_TOTAL", "BG", "SW"]
        assert result_df["STOIIP"].equals(volumetric_df["STOIIP"])
        assert result_df["STOIIP_TOTAL"].equals(volumetric_df["ASSOCIATEDOIL"])  # For gas
        assert result_df["SW"].equals(expected_sw)
        assert result_df["BG"].equals(expected_bg)

    def test_create_per_fluid_results_df_for_summed_fluids(self, volumetric_df, categorized_result_names):
        # Call the function
        result_df = create_per_fluid_results_df(volumetric_df, categorized_result_names, "oil + gas")

        # SW = 1 - HCPV/PORV
        expected_sw = pl.Series(
            [
                1 - 300 / 500,
                1 - 250 / 400,
                1 - 100 / 200,
                1 - 120 / 240,
                1 - 60 / 120,
                1 - 40 / 80,
                1 - 180 / 360,
                1 - 240 / 480,
            ]
        )

        # Check that the result DataFrame has the expected columns
        assert list(result_df.columns) == ["ZONE", "REGION", "REAL", "STOIIP", "STOIIP_TOTAL", "SW"]
        assert result_df["STOIIP"].equals(volumetric_df["STOIIP"])
        assert result_df["STOIIP_TOTAL"].equals(
            volumetric_df["STOIIP"] + volumetric_df["ASSOCIATEDOIL"]
        )  # For summed fluids
        assert result_df["SW"].equals(expected_sw)


class TestCreateStatisticalResultTableDataFromDf:
    @pytest.fixture
    def result_df(self) -> pl.DataFrame:
        return pl.DataFrame(
            {
                "ZONE": ["A", "A", "A", "B", "B", "B"],
                "REAL": [1, 2, 3, 1, 2, 3],
                "result_column": [10.0, 20.0, 30.0, 40.0, 60.0, 80.0],
            }
        )

    def test_create_statistical_result_table_data_from_df_with_fluid_column_error(self, result_df):
        # Add a FLUID column to the DataFrame
        df_with_fluid = result_df.with_columns([pl.lit("oil").alias("FLUID")])

        # Test that it raises the correct error
        with pytest.raises(
            InvalidDataError,
            match="The DataFrame should not contain FLUID column when calculating statistics across realizations",
        ):
            create_statistical_result_table_data_from_df(df_with_fluid)

    def test_create_statistical_result_table_data_from_df_without_real_column_error(self, result_df):
        # Remove the REAL column from the DataFrame
        df_without_real = result_df.drop("REAL")

        # Test that it raises the correct error
        with pytest.raises(
            InvalidDataError,
            match="Input DataFrame must contain 'REAL' column for realizations to calculate statistics across realizations",
        ):
            create_statistical_result_table_data_from_df(df_without_real)

    def test_create_statistical_result_table_data_from_df_with_index_columns(self, result_df):

        # Call the function
        selector_column_data_list, results_statistical_data_list = create_statistical_result_table_data_from_df(
            result_df
        )

        # Assertions (not control of order of the unique values, thus output has to be sorted)
        sorted_selector_column_data_list = sorted(selector_column_data_list, key=lambda x: x.column_name)
        assert len(sorted_selector_column_data_list) == 1  # ZONE
        assert sorted_selector_column_data_list[0].column_name == "ZONE"
        assert sorted(selector_column_data_list[0].unique_values) == ["A", "B"]
        assert sorted(selector_column_data_list[0].indices) == [0, 1]

        # Extract order of rows in the result data
        first_index = selector_column_data_list[0].indices[0]
        is_a_zone_first = selector_column_data_list[0].unique_values[first_index] == "A"

        # Expected statistical values
        mean_values = [20.0, 60.0] if is_a_zone_first else [60.0, 20.0]
        std_dev_values = [10.0, 20.0] if is_a_zone_first else [20.0, 10.0]
        min_values = [10.0, 40.0] if is_a_zone_first else [40.0, 10.0]
        max_values = [30.0, 80.0] if is_a_zone_first else [80.0, 30.0]
        p10_values = [28.0, 76.0] if is_a_zone_first else [76.0, 28.0]
        p90_values = [12.0, 44.0] if is_a_zone_first else [44.0, 12.0]

        assert len(results_statistical_data_list) == 1
        result_statistical_data = results_statistical_data_list[0]
        assert result_statistical_data.column_name == "result_column"
        assert result_statistical_data.statistic_values[Statistic.MEAN] == mean_values
        assert result_statistical_data.statistic_values[Statistic.STD_DEV] == std_dev_values
        assert result_statistical_data.statistic_values[Statistic.MIN] == min_values
        assert result_statistical_data.statistic_values[Statistic.MAX] == max_values
        assert result_statistical_data.statistic_values[Statistic.P10] == p10_values
        assert result_statistical_data.statistic_values[Statistic.P90] == p90_values

    def test_create_statistical_result_table_data_from_df_without_index_columns(self, result_df):
        # Remove all index columns
        df_without_indices = result_df.select(["REAL", "result_column"])

        # Call the function
        selector_column_data_list, results_statistical_data_list = create_statistical_result_table_data_from_df(
            df_without_indices
        )

        # Check the selector column data (should be empty)
        assert len(selector_column_data_list) == 0

        # Check the statistical data
        assert len(results_statistical_data_list) == 1  # result_column
        assert results_statistical_data_list[0].column_name == "result_column"

        # Check that each result has exactly 1 value per statistic (as we're aggregating the entire DataFrame)
        for result_data in results_statistical_data_list:
            for values in result_data.statistic_values.values():
                assert len(values) == 1


class TestPrivateInplaceResultsDfUtils:
    def test_get_statistical_function_expression(self) -> None:
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

    def test_create_statistical_expression_drop_nans(self) -> None:
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

    def test_create_statistical_expression_keep_nans(self) -> None:
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

    def test_create_statistic_aggregation_expressions_with_drop_nans(self) -> None:
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

    def test_create_statistic_aggregation_expressions_without_drop_nans(self) -> None:
        result_columns = ["column1"]
        statistics = [Statistic.STD_DEV, Statistic.P10, Statistic.P90]

        expressions = _create_statistic_aggregation_expressions(result_columns, statistics, drop_nans=False)

        assert len(expressions) == len(result_columns) * len(statistics)
        assert expressions[0].meta.eq(pl.col("column1").std().alias(f"column1_{Statistic.STD_DEV.value}"))
        assert expressions[1].meta.eq(pl.col("column1").quantile(0.9, "linear").alias(f"column1_{Statistic.P10.value}"))
        assert expressions[2].meta.eq(pl.col("column1").quantile(0.1, "linear").alias(f"column1_{Statistic.P90.value}"))

    def test_create_statistic_aggregation_expressions_empty_columns(self) -> None:
        result_columns: list[str] = []
        statistics = [Statistic.MEAN, Statistic.MIN, Statistic.MAX]

        expressions = _create_statistic_aggregation_expressions(result_columns, statistics)

        assert len(expressions) == 0

    def test_create_statistic_aggregation_expressions_empty_statistics(self) -> None:
        result_columns = ["column1", "column2"]
        statistics: list[Statistic] = []

        expressions = _create_statistic_aggregation_expressions(result_columns, statistics)

        assert len(expressions) == 0

    def test_convert_statistical_df_to_statistical_result_table_data(self) -> None:
        # Create a sample statistical DataFrame
        data = {
            "ZONE": ["A", "B", "A", "B"],
            "REGION": ["X", "X", "Y", "Y"],
            "result1_mean": [10.0, 20.0, 30.0, 40.0],
            "result1_stddev": [1.0, 2.0, 3.0, 4.0],
            "result1_min": [5.0, 15.0, 25.0, 35.0],
            "result1_max": [15.0, 25.0, 35.0, 45.0],
            "result1_p10": [8.0, 18.0, 28.0, 38.0],
            "result1_p90": [12.0, 22.0, 32.0, 42.0],
        }
        statistical_df = pl.DataFrame(data)

        valid_result_names = ["result1"]
        requested_statistics = [
            Statistic.MEAN,
            Statistic.STD_DEV,
            Statistic.MIN,
            Statistic.MAX,
            Statistic.P10,
            Statistic.P90,
        ]

        selector_column_data_list, results_statistical_data_list = (
            _convert_statistical_results_df_to_statistical_results_table_data(
                statistical_df, valid_result_names, requested_statistics
            )
        )

        # Assertions (not control of order of the unique values, thus output has to be sorted)
        assert len(selector_column_data_list) == 2
        assert selector_column_data_list[0].column_name == "ZONE"
        assert sorted(selector_column_data_list[0].unique_values) == ["A", "B"]
        assert sorted(selector_column_data_list[0].indices) == [0, 0, 1, 1]

        assert selector_column_data_list[1].column_name == "REGION"
        assert sorted(selector_column_data_list[1].unique_values) == ["X", "Y"]
        assert sorted(selector_column_data_list[1].indices) == [0, 0, 1, 1]

        assert len(results_statistical_data_list) == 1
        result_statistical_data = results_statistical_data_list[0]
        assert result_statistical_data.column_name == "result1"
        assert result_statistical_data.statistic_values[Statistic.MEAN] == [10.0, 20.0, 30.0, 40.0]
        assert result_statistical_data.statistic_values[Statistic.STD_DEV] == [1.0, 2.0, 3.0, 4.0]
        assert result_statistical_data.statistic_values[Statistic.MIN] == [5.0, 15.0, 25.0, 35.0]
        assert result_statistical_data.statistic_values[Statistic.MAX] == [15.0, 25.0, 35.0, 45.0]
        assert result_statistical_data.statistic_values[Statistic.P10] == [8.0, 18.0, 28.0, 38.0]
        assert result_statistical_data.statistic_values[Statistic.P90] == [12.0, 22.0, 32.0, 42.0]

    def test_convert_statistical_df_to_statistical_result_table_data_missing_column(self) -> None:
        # Create a sample statistical DataFrame with a missing column
        data = {
            "selector1": ["A", "B", "A", "B"],
            "selector2": [1, 2, 1, 2],
            "result1_mean": [10.0, 20.0, 30.0, 40.0],
            "result1_stddev": [1.0, 2.0, 3.0, 4.0],
            "result1_min": [5.0, 15.0, 25.0, 35.0],
            "result1_max": [15.0, 25.0, 35.0, 45.0],
            "result1_p10": [8.0, 18.0, 28.0, 38.0],
            # Missing result1_p90 column
        }
        statistical_df = pl.DataFrame(data)

        valid_result_names = ["result1"]
        requested_statistics = [
            Statistic.MEAN,
            Statistic.STD_DEV,
            Statistic.MIN,
            Statistic.MAX,
            Statistic.P10,
            Statistic.P90,
        ]

        with pytest.raises(ValueError, match="Column result1_p90 not found in statistical table"):
            _convert_statistical_results_df_to_statistical_results_table_data(
                statistical_df, valid_result_names, requested_statistics
            )

    def test_validate_length_of_statistics_data_lists_equal_lengths(self) -> None:
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

    def test_validate_length_of_statistics_data_lists_empty_lists(self) -> None:
        selector_column_data_list: list[RepeatedTableColumnData] = []
        result_statistical_data_list: list[TableColumnStatisticalData] = []
        # Should not raise any exception
        _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)

    def test_validate_length_of_statistics_data_lists_mismatched_lengths_selector_vs_statistic(self) -> None:
        selector_column_data_list = [
            RepeatedTableColumnData(column_name="selector1", unique_values=[1, 2], indices=[0, 1])
        ]
        result_statistical_data_list = [
            TableColumnStatisticalData(
                column_name="result1",
                statistic_values={Statistic.MEAN: [1.0, 2.0, 1.5], Statistic.STD_DEV: [0.1, 0.2, 0.15]},
            )
        ]
        with pytest.raises(
            ValueError,
            match="Number of result1 statistic mean values does not match expected number of rows: 2. Got: 3",
        ):
            _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)

    def test_validate_length_of_statistics_data_lists_mismatched_lengths_selector_vs_selector(self) -> None:
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

    def test_validate_length_of_statistics_data_lists_mismatched_lengths_statistic(self) -> None:
        selector_column_data_list = [
            RepeatedTableColumnData(column_name="selector1", unique_values=[1, 2], indices=[0, 1, 0])
        ]
        result_statistical_data_list = [
            TableColumnStatisticalData(
                column_name="result1",
                statistic_values={Statistic.MEAN: [1.0, 2.0], Statistic.STD_DEV: [0.1, 0.2, 0.15]},
            )
        ]
        with pytest.raises(
            ValueError,
            match="Number of result1 statistic mean values does not match expected number of rows: 3. Got: 2",
        ):
            _validate_length_of_statistics_data_lists(selector_column_data_list, result_statistical_data_list)
