import polars as pl

from .types import (
    WellProductionData,
    WellInjectionData,
)

from ._internal_types import _PRODCOLUMNS, _INJCOLUMNS, _INJECTIONTYPE


def calculate_total_production_from_daily(
    api_results: list[dict], start_date: str, end_date: str
) -> list[WellProductionData]:
    """Calculate total production per well from daily production data."""
    polars_df = pl.DataFrame(
        api_results,
        schema_overrides={
            _PRODCOLUMNS.WB_OIL_VOL_SM3: pl.Float32,
            _PRODCOLUMNS.WB_GAS_VOL_SM3: pl.Float32,
            _PRODCOLUMNS.WB_WATER_VOL_M3: pl.Float32,
        },
    )

    # Group per well and sum oil,gas,water volumes
    grouped_df = (
        polars_df.group_by([_PRODCOLUMNS.WELL_UUID, _PRODCOLUMNS.WB_UUID])
        .agg(
            [
                pl.col(_PRODCOLUMNS.WB_OIL_VOL_SM3).sum().fill_null(0.0),
                pl.col(_PRODCOLUMNS.WB_GAS_VOL_SM3).sum().fill_null(0.0),
                pl.col(_PRODCOLUMNS.WB_WATER_VOL_M3).sum().fill_null(0.0),
                pl.col(_PRODCOLUMNS.WB_UWBI).first(),
            ]
        )
        .sort(by=_PRODCOLUMNS.WB_UWBI)
    )

    # Convert to list of WellProductionData
    return [
        WellProductionData(
            wellbore_uuid=row[0],  # WB_UUID
            wellbore_uwbi=row[4],  # WB_UWBI
            start_date=start_date,
            end_date=end_date,
            oil_production_sm3=row[1],  # Oil sum
            gas_production_sm3=row[2],  # Gas sum
            water_production_m3=row[3],  # Water sum
        )
        for row in grouped_df.select(
            [
                _PRODCOLUMNS.WB_UUID,
                _PRODCOLUMNS.WB_OIL_VOL_SM3,
                _PRODCOLUMNS.WB_GAS_VOL_SM3,
                _PRODCOLUMNS.WB_WATER_VOL_M3,
                _PRODCOLUMNS.WB_UWBI,
            ]
        ).rows()
    ]


def calculate_total_injection_from_daily(
    api_results: list[dict], start_date: str, end_date: str
) -> list[WellInjectionData]:
    """Calculate total injection per well from daily injection data."""
    polars_df = pl.DataFrame(api_results, schema_overrides={_INJCOLUMNS.WB_INJ_VOL: pl.Float32})

    # Group per well and sum injection volumes by type
    grouped_df = (
        polars_df.group_by([_INJCOLUMNS.WB_UUID])
        .agg(
            [
                pl.col(_INJCOLUMNS.WB_INJ_VOL)
                .filter(pl.col(_INJCOLUMNS.INJ_TYPE) == _INJECTIONTYPE.WATER)
                .sum()
                .fill_null(0.0)
                .alias("water_injection"),
                pl.col(_INJCOLUMNS.WB_INJ_VOL)
                .filter(pl.col(_INJCOLUMNS.INJ_TYPE) == _INJECTIONTYPE.GAS)
                .sum()
                .fill_null(0.0)
                .alias("gas_injection"),
                pl.col(_INJCOLUMNS.WB_UWBI).first(),
            ]
        )
        .sort(by=_INJCOLUMNS.WB_UWBI)
    )

    # Convert to list of WellInjectionData
    return [
        WellInjectionData(
            wellbore_uuid=row[0],  # WB_UUID
            start_date=start_date,
            end_date=end_date,
            water_injection=row[1],  # Water injection sum
            gas_injection=row[2],  # Gas injection sum
        )
        for row in grouped_df.rows()
    ]
