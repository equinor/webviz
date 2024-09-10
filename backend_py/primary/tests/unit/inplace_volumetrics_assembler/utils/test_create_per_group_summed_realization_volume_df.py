from typing import List
import pytest
import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import create_per_group_summed_realization_volume_df
from primary.services.sumo_access.inplace_volumetrics_types import InplaceVolumetricsIdentifier


def test_create_per_group_summed_realization_volume_df() -> None:
    # Create a sample DataFrame
    volume_df = pl.DataFrame(
        {
            "REAL": [1, 1, 2, 2],
            "ZONE": ["A", "A", "B", "B"],
            "REGION": ["X", "X", "Y", "Y"],
            "VOLUME1": [10, 20, 30, 40],
            "VOLUME2": [100, 200, 300, 400],
        }
    )

    # Define group by identifiers
    group_by_identifiers = [
        InplaceVolumetricsIdentifier.ZONE,
        InplaceVolumetricsIdentifier.REGION,
    ]

    # Call the function
    result_df = create_per_group_summed_realization_volume_df(volume_df, group_by_identifiers)

    # Expected result
    expected_df = pl.DataFrame(
        {
            "REAL": [1, 2],
            "ZONE": ["A", "B"],
            "REGION": ["X", "Y"],
            "VOLUME1": [30, 70],
            "VOLUME2": [300, 700],
        }
    )

    # Sort result_df and reorder columns
    result_df = result_df.sort("REAL", "ZONE", "REGION").select(["REAL", "ZONE", "REGION", "VOLUME1", "VOLUME2"])

    # Assert the result
    assert result_df.equals(expected_df)


def test_create_per_group_summed_realization_volume_df_no_group_by_identifiers() -> None:
    # Create a sample DataFrame
    volume_df = pl.DataFrame(
        {
            "REAL": [1, 1, 2, 2],
            "ZONE": ["A", "A", "B", "B"],
            "REGION": ["X", "X", "Y", "Y"],
            "VOLUME1": [10, 20, 30, 40],
            "VOLUME2": [100, 200, 300, 400],
        }
    )

    # Define empty group by identifiers
    group_by_identifiers: List[InplaceVolumetricsIdentifier] = []

    # Call the function
    result_df = create_per_group_summed_realization_volume_df(volume_df, group_by_identifiers).sort("REAL")

    # Expected result
    expected_df = pl.DataFrame(
        {
            "REAL": [1, 2],
            "VOLUME1": [30, 70],
            "VOLUME2": [300, 700],
        }
    )

    # Assert the result
    assert result_df.equals(expected_df)


def test_create_per_group_summed_realization_volume_df_missing_real_column() -> None:
    # Create a sample DataFrame without the "REAL" column
    volume_df = pl.DataFrame(
        {
            "ZONE": ["A", "A", "B", "B"],
            "REGION": ["X", "X", "Y", "Y"],
            "VOLUME1": [10, 20, 30, 40],
            "VOLUME2": [100, 200, 300, 400],
        }
    )

    # Define group by identifiers
    group_by_identifiers = [
        InplaceVolumetricsIdentifier.ZONE,
        InplaceVolumetricsIdentifier.REGION,
    ]

    # Call the function and expect a ValueError
    with pytest.raises(ValueError, match="REAL column not found in volume DataFrame"):
        create_per_group_summed_realization_volume_df(volume_df, group_by_identifiers)
