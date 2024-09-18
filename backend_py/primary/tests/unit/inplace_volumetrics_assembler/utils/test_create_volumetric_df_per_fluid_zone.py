import pytest
import polars as pl

from primary.services.inplace_volumetrics_assembler._utils import create_volumetric_df_per_fluid_zone
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


def test_create_volumetric_df_per_fluid_zone(volumetric_df: pl.DataFrame) -> None:
    fluid_zones = [FluidZone.OIL, FluidZone.GAS]
    result = create_volumetric_df_per_fluid_zone(fluid_zones, volumetric_df)

    assert FluidZone.OIL in result
    assert FluidZone.GAS in result

    oil_df = result[FluidZone.OIL]
    gas_df = result[FluidZone.GAS]

    assert oil_df.columns == ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "HCPV"]
    assert gas_df.columns == ["REAL", "ZONE", "REGION", "FACIES", "GIIP", "HCPV"]

    assert oil_df.shape == (3, 6)
    assert gas_df.shape == (3, 6)

    assert oil_df["STOIIP"].to_list() == [100, 200, 300]
    assert oil_df["HCPV"].to_list() == [700, 800, 900]

    assert gas_df["GIIP"].to_list() == [400, 500, 600]
    assert gas_df["HCPV"].to_list() == [1000, 1100, 1200]


def test_create_volumetric_df_per_fluid_zone_no_fluid_columns(volumetric_df: pl.DataFrame) -> None:
    fluid_zones = [FluidZone.OIL, FluidZone.GAS]
    volumetric_df = volumetric_df.select(["REAL", "ZONE", "REGION", "FACIES"])  # Removing fluid columns
    result = create_volumetric_df_per_fluid_zone(fluid_zones, volumetric_df)

    assert not result
