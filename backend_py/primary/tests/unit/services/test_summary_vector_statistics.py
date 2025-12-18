import pytest
import pyarrow as pa
from datetime import datetime
from unittest.mock import patch, MagicMock
from webviz_services.summary_vector_statistics import compute_vector_statistics_table
from webviz_services.utils.statistic_function import StatisticFunction
from webviz_services.service_exceptions import InvalidParameterError


class TestComputeVectorStatisticsTable:

    def test_empty_table_returns_none(self):
        """Test that empty table returns None"""
        empty_table = pa.table(
            {"DATE": pa.array([], type=pa.timestamp("ms")), "VECTOR": pa.array([], type=pa.float64())}
        )

        result = compute_vector_statistics_table(empty_table, "VECTOR", None)

        assert result is None

    def test_empty_statistic_functions_raises_error(self):
        """Test that empty statistic functions list raises InvalidParameterError"""
        table = pa.table(
            {
                "DATE": pa.array([datetime(2020, 1, 1)], type=pa.timestamp("ms")),
                "VECTOR": pa.array([1.0], type=pa.float64()),
            }
        )

        with pytest.raises(InvalidParameterError) as exc_info:
            compute_vector_statistics_table(table, "VECTOR", [])

        assert "At least one statistic must be requested" in str(exc_info.value)

    def test_none_statistic_functions_computes_all_defaults(self):
        """Test that None statistic_functions computes all default statistics"""
        dates = [datetime(2020, 1, 1), datetime(2020, 1, 1), datetime(2020, 1, 1)]
        values = [1.0, 2.0, 3.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", None)

        assert result is not None
        assert "DATE" in result.column_names
        assert "MIN" in result.column_names
        assert "MAX" in result.column_names
        assert "MEAN" in result.column_names
        assert "P10" in result.column_names
        assert "P50" in result.column_names
        assert "P90" in result.column_names

    def test_specific_statistic_functions(self):
        """Test computing specific statistic functions"""
        dates = [datetime(2020, 1, 1), datetime(2020, 1, 1), datetime(2020, 1, 1)]
        values = [1.0, 2.0, 3.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", [StatisticFunction.MIN, StatisticFunction.MAX])

        assert result is not None
        assert "DATE" in result.column_names
        assert "MIN" in result.column_names
        assert "MAX" in result.column_names
        assert "MEAN" not in result.column_names
        assert result.num_rows == 1

    def test_min_statistic_computation(self):
        """Test MIN statistic computation"""
        dates = [datetime(2020, 1, 1)] * 3
        values = [1.0, 2.0, 3.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", [StatisticFunction.MIN])

        assert result["MIN"][0].as_py() == 1.0

    def test_max_statistic_computation(self):
        """Test MAX statistic computation"""
        dates = [datetime(2020, 1, 1)] * 3
        values = [1.0, 2.0, 3.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", [StatisticFunction.MAX])

        assert result["MAX"][0].as_py() == 3.0

    def test_mean_statistic_computation(self):
        """Test MEAN statistic computation"""
        dates = [datetime(2020, 1, 1)] * 3
        values = [1.0, 2.0, 3.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", [StatisticFunction.MEAN])

        assert result["MEAN"][0].as_py() == pytest.approx(2.0)

    def test_handles_nan_and_null_values(self):
        """Test that NaN and null values are properly excluded"""
        dates = [datetime(2020, 1, 1)] * 5
        values = [1.0, 2.0, float("nan"), None, 3.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", [StatisticFunction.MEAN])

        # Mean should be (1.0 + 2.0 + 3.0) / 3 = 2.0
        assert result["MEAN"][0].as_py() == pytest.approx(2.0)

    def test_multiple_dates_grouped_correctly(self):
        """Test that statistics are computed per date group"""
        dates = [datetime(2020, 1, 1), datetime(2020, 1, 1), datetime(2020, 1, 2), datetime(2020, 1, 2)]
        values = [1.0, 2.0, 3.0, 4.0]
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(table, "VECTOR", [StatisticFunction.MEAN])

        assert result.num_rows == 2
        assert result["MEAN"][0].as_py() == pytest.approx(1.5)
        assert result["MEAN"][1].as_py() == pytest.approx(3.5)

    def test_p10_p50_p90_percentiles(self):
        """Test percentile calculations (P10, P50, P90)"""
        dates = [datetime(2020, 1, 1)] * 10
        values = list(range(1, 11))  # 1 to 10
        table = pa.table(
            {"DATE": pa.array(dates, type=pa.timestamp("ms")), "VECTOR": pa.array(values, type=pa.float64())}
        )

        result = compute_vector_statistics_table(
            table, "VECTOR", [StatisticFunction.P10, StatisticFunction.P50, StatisticFunction.P90]
        )

        # P10 = 90th percentile (oil industry convention)
        # P50 = 50th percentile (median)
        # P90 = 10th percentile (oil industry convention)
        assert result["P10"][0].as_py() > result["P50"][0].as_py()
        assert result["P50"][0].as_py() > result["P90"][0].as_py()
