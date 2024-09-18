from typing import List
import pytest
import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import (
    create_grouped_statistical_result_table_data_polars,
)
from primary.services.sumo_access.inplace_volumetrics_types import (
    Statistic,
    InplaceVolumetricsIdentifier,
)
from primary.services.service_exceptions import InvalidParameterError


def test_create_grouped_statistical_result_table_data_polars() -> None:
    # Create a sample result DataFrame
    data = {
        "ZONE": ["A", "B", "A", "B"],
        "REGION": ["X", "X", "Y", "Y"],
        "REAL": [1, 2, 1, 2],
        "result1": [10.0, 20.0, 30.0, 40.0],
    }
    result_df = pl.DataFrame(data)

    # Group by zone, i.e. get two  unique selector values ["A", "B"]
    group_by_identifiers = [InplaceVolumetricsIdentifier.ZONE]

    selector_column_data_list, results_statistical_data_list = create_grouped_statistical_result_table_data_polars(
        result_df, group_by_identifiers
    )

    # Assertions (not control of order of the unique values, thus output has to be sorted)
    assert len(selector_column_data_list) == 1
    assert selector_column_data_list[0].column_name == "ZONE"
    assert sorted(selector_column_data_list[0].unique_values) == ["A", "B"]
    assert sorted(selector_column_data_list[0].indices) == [0, 1]

    # Extract order of rows in the result data
    first_index = selector_column_data_list[0].indices[0]
    is_a_zone_first = selector_column_data_list[0].unique_values[first_index] == "A"

    # Expected statistical values
    mean_values = [20.0, 30.0] if is_a_zone_first else [30.0, 20.0]
    std_dev_values = [14.142135623730951, 14.142135623730951]
    min_values = [10.0, 20.0] if is_a_zone_first else [20.0, 10.0]
    max_values = [30.0, 40.0] if is_a_zone_first else [40.0, 30.0]
    p10_values = [28.0, 38.0] if is_a_zone_first else [38.0, 28.0]
    p90_values = [12.0, 22.0] if is_a_zone_first else [22.0, 12.0]

    assert len(results_statistical_data_list) == 1
    result_statistical_data = results_statistical_data_list[0]
    assert result_statistical_data.column_name == "result1"
    assert result_statistical_data.statistic_values[Statistic.MEAN] == mean_values
    assert result_statistical_data.statistic_values[Statistic.STD_DEV] == std_dev_values
    assert result_statistical_data.statistic_values[Statistic.MIN] == min_values
    assert result_statistical_data.statistic_values[Statistic.MAX] == max_values
    assert result_statistical_data.statistic_values[Statistic.P10] == p10_values
    assert result_statistical_data.statistic_values[Statistic.P90] == p90_values


def test_create_grouped_statistical_result_table_data_polars_no_grouping() -> None:
    # Create a sample result DataFrame
    data = {
        "ZONE": ["A", "A", "B", "B"],
        "REGION": ["X", "X", "Y", "Y"],
        "REAL": [1, 2, 1, 2],
        "result1": [10.0, 20.0, 30.0, 40.0],
    }
    result_df = pl.DataFrame(data)

    group_by_identifiers = None

    selector_column_data_list, results_statistical_data_list = create_grouped_statistical_result_table_data_polars(
        result_df, group_by_identifiers
    )

    # Assertions
    assert len(selector_column_data_list) == 0

    assert len(results_statistical_data_list) == 1
    result_statistical_data = results_statistical_data_list[0]
    assert result_statistical_data.column_name == "result1"
    assert result_statistical_data.statistic_values[Statistic.MEAN] == [25.0]
    assert result_statistical_data.statistic_values[Statistic.STD_DEV] == [12.909944487358056]
    assert result_statistical_data.statistic_values[Statistic.MIN] == [10.0]
    assert result_statistical_data.statistic_values[Statistic.MAX] == [40.0]
    assert result_statistical_data.statistic_values[Statistic.P10] == [37.0]
    assert result_statistical_data.statistic_values[Statistic.P90] == [13.0]


def test_create_grouped_statistical_result_table_data_polars_empty_grouping_list() -> None:
    # Create a sample result DataFrame
    data = {
        "ZONE": ["A", "A", "B", "B"],
        "REGION": ["X", "X", "Y", "Y"],
        "REAL": [1, 2, 1, 2],
        "result1": [10.0, 20.0, 30.0, 40.0],
    }
    result_df = pl.DataFrame(data)

    empty_group_by_identifiers_list: List[InplaceVolumetricsIdentifier] = []

    with pytest.raises(InvalidParameterError, match="Group by identifiers must be a non-empty list or None"):
        create_grouped_statistical_result_table_data_polars(result_df, empty_group_by_identifiers_list)
