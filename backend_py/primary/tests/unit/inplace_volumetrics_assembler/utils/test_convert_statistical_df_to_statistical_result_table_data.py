import pytest
import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import (
    _convert_statistical_df_to_statistical_result_table_data,
)
from primary.services.sumo_access.inplace_volumetrics_types import Statistic


def test_convert_statistical_df_to_statistical_result_table_data() -> None:
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

    selector_column_data_list, results_statistical_data_list = _convert_statistical_df_to_statistical_result_table_data(
        statistical_df, valid_result_names, requested_statistics
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


def test_convert_statistical_df_to_statistical_result_table_data_missing_column() -> None:
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
        _convert_statistical_df_to_statistical_result_table_data(
            statistical_df, valid_result_names, requested_statistics
        )
