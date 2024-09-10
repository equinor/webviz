import pytest
import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import create_volumetric_summed_fluid_zones_df
from primary.services.sumo_access.inplace_volumetrics_types import FluidZone


@pytest.fixture
def volumetric_df() -> pl.DataFrame:
    data = {
        "REAL": [1, 2, 3],
        "ZONE": ["A", "B", "C"],
        "REGION": ["X", "Y", "Z"],
        "FACIES": ["F1", "F2", "F3"],
        "STOIIP_OIL": [100, 200, 300],
        "GIIP_GAS": [400, 500, 600],
        "HCPV_OIL": [700, 800, 900],
        "HCPV_GAS": [1000, 1100, 1200],
        "HCPV_WATER": [1300, 1400, 1500],
    }
    return pl.DataFrame(data)


def test_create_volumetric_summed_fluid_zones_df(volumetric_df: pl.DataFrame) -> None:

    fluid_zones = [FluidZone.OIL, FluidZone.GAS]
    result = create_volumetric_summed_fluid_zones_df(volumetric_df, fluid_zones)

    assert sorted(result.columns) == sorted(["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "GIIP", "HCPV"])
    assert result.shape == (3, 7)

    assert result["STOIIP"].to_list() == [100, 200, 300]
    assert result["GIIP"].to_list() == [400, 500, 600]
    assert result["HCPV"].to_list() == [1700, 1900, 2100]  # Should exclude HCPV_WATER


def test_create_volumetric_summed_fluid_zones_df_no_fluid_columns(volumetric_df: pl.DataFrame) -> None:
    fluid_zones = [FluidZone.OIL, FluidZone.GAS]
    volumetric_df = volumetric_df.select(["REAL", "ZONE", "REGION", "FACIES"])  # Removing fluid columns
    result = create_volumetric_summed_fluid_zones_df(volumetric_df, fluid_zones)

    assert sorted(result.columns) == sorted(["REAL", "ZONE", "REGION", "FACIES"])
    assert result.shape == (3, 4)


def test_create_volumetric_summed_fluid_zones_df_partial_fluid_columns(volumetric_df: pl.DataFrame) -> None:
    fluid_zones = [FluidZone.OIL, FluidZone.GAS]
    volumetric_df = volumetric_df.select(
        ["REAL", "ZONE", "REGION", "FACIES", "STOIIP_OIL", "HCPV_OIL"]
    )  # Partial fluid columns
    result = create_volumetric_summed_fluid_zones_df(volumetric_df, fluid_zones)

    assert sorted(result.columns) == sorted(["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "HCPV"])
    assert result.shape == (3, 6)

    assert result["STOIIP"].to_list() == [100, 200, 300]
    assert result["HCPV"].to_list() == [700, 800, 900]
